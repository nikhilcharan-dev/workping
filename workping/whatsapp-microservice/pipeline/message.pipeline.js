import { detectIntent } from "../intent/intent.llm.js";
import { ruleEngine } from "../intent/rule.engine.js";
import { buildContext } from "../context/context.builder.js";
import { resolveResponseStrategy } from "../response/strategy.resolver.js";
import { generateLLMResponse } from "../response/llm.generator.js";
import { getTemplateResponse } from "../response/templates.js";
import { sendWhatsAppMessage } from "../whatsapp/sender.js";
import { isFirstTimeUser, getWelcomeMessage } from "../utils/user.tracker.js";
import { trackMessage, trackError } from "../utils/analytics.js";
import { getFlow, addMessage, clearFlow } from "../utils/conversation.state.js";
import { checkGuards } from "../utils/rate.limiter.js";

async function resolveFlowIntent(phone, text, ruleIntent) {
    const flow = await getFlow(phone);
    if (!flow) return null;

    const msg = text.toLowerCase().trim();

    if (ruleIntent && ["GREETING", "HELP", "GOODBYE"].includes(ruleIntent.intent)) {
        await clearFlow(phone);
        return null;
    }

    if (flow.flow === "LEAVE_REQUEST") {
        if (flow.step === "AWAITING_CONFIRM") {
            if (/^(yes|yeah|yep|confirm|ok|sure|go ahead|approved?)$/i.test(msg)) {
                return { intent: "CONFIRM", confidence: 0.98 };
            }
            if (/^(no|nah|cancel|stop|nevermind|never mind)$/i.test(msg)) {
                return { intent: "CANCEL", confidence: 0.98 };
            }
            return { intent: "CONFIRM", confidence: 0.5, _remind: true };
        }
        if (
            ["AWAITING_TYPE", "AWAITING_FROM_DATE", "AWAITING_TO_DATE", "AWAITING_REASON", "AWAITING_DETAILS"].includes(
                flow.step
            )
        ) {
            return { intent: "LEAVE_REQUEST", confidence: 0.9 };
        }
    }

    if (flow.flow === "COMPLAINT") {
        if (flow.step === "AWAITING_CONFIRM") {
            if (/^(yes|yeah|yep|confirm|ok|sure)$/i.test(msg)) {
                return { intent: "CONFIRM", confidence: 0.98 };
            }
            if (/^(no|nah|cancel|stop|nevermind|never mind)$/i.test(msg)) {
                return { intent: "CANCEL", confidence: 0.98 };
            }
            return { intent: "CONFIRM", confidence: 0.5, _remind: true };
        }
        if (flow.step === "AWAITING_DESCRIPTION") {
            return { intent: "COMPLAINT", confidence: 0.9 };
        }
    }

    if (flow.flow === "LEAVE_APPROVAL" && flow.step === "AWAITING_DECISION") {
        if (/^(yes|yeah|yep|confirm|ok|sure|approve|approved)$/i.test(msg)) {
            return { intent: "LEAVE_APPROVE_DECISION", confidence: 0.98 };
        }
        if (/^(no|nah|cancel|reject|rejected|deny|denied)$/i.test(msg)) {
            return { intent: "LEAVE_REJECT_DECISION", confidence: 0.98 };
        }
        return { intent: "LEAVE_APPROVE_DECISION", confidence: 0.5, _remind: true };
    }

    return null;
}

async function process(internalMessage) {
    const startTime = Date.now();
    try {
        /* 0. Rate limit & profanity guard */
        const guard = await checkGuards(internalMessage.from, internalMessage.text);
        if (!guard.allowed) {
            await sendWhatsAppMessage({ to: internalMessage.from, text: guard.replyText });
            await addMessage(internalMessage.from, "assistant", guard.replyText);
            trackMessage({
                from: internalMessage.from,
                username: internalMessage.username,
                text: internalMessage.text,
                intent: guard.reason,
                confidence: 1,
                mode: "GUARD",
                responseTimeMs: Date.now() - startTime,
            });
            return;
        }

        /* 1. Welcome message for first-time users */
        if (await isFirstTimeUser(internalMessage.from)) {
            const welcomeText = getWelcomeMessage(internalMessage.username);
            await sendWhatsAppMessage({ to: internalMessage.from, text: welcomeText });
            await addMessage(internalMessage.from, "user", internalMessage.text);
            await addMessage(internalMessage.from, "assistant", welcomeText);
            trackMessage({
                from: internalMessage.from,
                username: internalMessage.username,
                text: internalMessage.text,
                intent: "GREETING",
                confidence: 1,
                mode: "TEMPLATE",
                responseTimeMs: Date.now() - startTime,
            });
            return;
        }

        await addMessage(internalMessage.from, "user", internalMessage.text);

        /* 2. Intent Detection */
        const ruleResult = ruleEngine(internalMessage.text);
        let intentResult = await resolveFlowIntent(internalMessage.from, internalMessage.text, ruleResult);

        if (intentResult) {
            if (intentResult._remind) {
                const flow = await getFlow(internalMessage.from);
                let reminderText;
                if (flow?.flow === "LEAVE_REQUEST") {
                    const { leaveType, fromDate, toDate } = flow.pendingData;
                    reminderText =
                        `You have a pending leave request:\n\n` +
                        `*Type:* ${leaveType} Leave\n` +
                        `*From:* ${fromDate}\n` +
                        `*To:* ${toDate}\n\n` +
                        "Reply *yes* to confirm or *no* to cancel.";
                } else if (flow?.flow === "LEAVE_APPROVAL") {
                    const { employeeName, days, dateList } = flow.pendingData;
                    reminderText =
                        `You have a pending leave approval:\n\n` +
                        `*Employee:* ${employeeName}\n` +
                        `*Days:* ${days} (${dateList})\n\n` +
                        "Reply *yes* to approve or *no* to reject.";
                } else if (flow?.flow === "COMPLAINT") {
                    reminderText =
                        flow.step === "AWAITING_CONFIRM"
                            ? "Reply *yes* to submit your complaint to HR or *no* to cancel."
                            : "Please describe your complaint or issue in detail:";
                } else {
                    reminderText = "Please reply *yes* or *no* to continue.";
                }
                await sendWhatsAppMessage({ to: internalMessage.from, text: reminderText });
                await addMessage(internalMessage.from, "assistant", reminderText);
                trackMessage({
                    from: internalMessage.from,
                    username: internalMessage.username,
                    text: internalMessage.text,
                    intent: "FLOW_REMINDER",
                    confidence: 0.5,
                    mode: "TEMPLATE",
                    responseTimeMs: Date.now() - startTime,
                });
                return;
            }
        } else if (ruleResult) {
            intentResult = ruleResult;
        } else {
            intentResult = await detectIntent(internalMessage.text);
        }

        /* 3. Context Building */
        const context = await buildContext(internalMessage, intentResult);

        /* 4. Strategy Resolution */
        const strategy = resolveResponseStrategy(intentResult, context);

        /* 5. Response Generation */
        let replyText = null;

        if (strategy.mode === "TEMPLATE") {
            replyText = await getTemplateResponse(strategy, context);
        }

        if (strategy.mode === "LLM" || !replyText) {
            replyText = await generateLLMResponse(strategy, context, internalMessage);
        }

        if (!replyText) {
            console.warn("[PIPELINE] No reply generated, skipping send");
            return;
        }

        if (guard.warning) {
            replyText += "\n\n_" + guard.warning + "_";
        }

        /* 6. Send */
        await sendWhatsAppMessage({ to: internalMessage.from, text: replyText });
        await addMessage(internalMessage.from, "assistant", replyText);

        trackMessage({
            from: internalMessage.from,
            username: internalMessage.username,
            text: internalMessage.text,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            mode: strategy.mode,
            responseTimeMs: Date.now() - startTime,
        });
    } catch (error) {
        trackError();
        console.error("[PIPELINE] Failure:", error.message);
    }
}

export default { process };
