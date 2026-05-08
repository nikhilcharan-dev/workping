import User from "#models/User.js";
import { sendGreetingMail } from "#services/mailer/mail.service.js";

export const insertEmployees = async (data) => {
    await User.insertMany(data);

    // Send welcome / onboarding email to each new employee
    for (const user of data) {
        try {
            await sendGreetingMail(
                user.email,
                user.name,
                user.organizationId?.toString() ?? "WorkPing",
                user.role ?? "employee"
            );
        } catch (err) {
            // Log but don't block — employee creation shouldn't fail if mail service is down
            console.error(`Failed to send greeting email to ${user.email}:`, err.message);
        }
    }
};
