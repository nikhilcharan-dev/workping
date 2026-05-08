import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getUserById } from "@/helpers/data";

const ChatContext = createContext(undefined);

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext can only be used within ChatProvider");
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [activeChat, setActiveChat] = useState();
    const [offcanvasStates, setOffcanvasStates] = useState({
        showChatList: false,
        showUserProfile: false,
        showVoiceCall: false,
        showVideoCall: false,
        showUserSetting: false,
    });

    const changeActiveChat = useCallback(async (userId) => {
        try {
            const user = await getUserById(userId);
            if (user) setActiveChat(user);
        } catch (e) {
            // Failed to load chat user
        }
    }, []);

    const toggle = useCallback((key) => () => setOffcanvasStates((prev) => ({ ...prev, [key]: !prev[key] })), []);

    const chatList = useMemo(
        () => ({ open: offcanvasStates.showChatList, toggle: toggle("showChatList") }),
        [offcanvasStates.showChatList, toggle]
    );
    const chatProfile = useMemo(
        () => ({ open: offcanvasStates.showUserProfile, toggle: toggle("showUserProfile") }),
        [offcanvasStates.showUserProfile, toggle]
    );
    const voiceCall = useMemo(
        () => ({ open: offcanvasStates.showVoiceCall, toggle: toggle("showVoiceCall") }),
        [offcanvasStates.showVoiceCall, toggle]
    );
    const videoCall = useMemo(
        () => ({ open: offcanvasStates.showVideoCall, toggle: toggle("showVideoCall") }),
        [offcanvasStates.showVideoCall, toggle]
    );
    const chatSetting = useMemo(
        () => ({ open: offcanvasStates.showUserSetting, toggle: toggle("showUserSetting") }),
        [offcanvasStates.showUserSetting, toggle]
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = await getUserById("101");
                if (!cancelled && user) setActiveChat(user);
            } catch (e) {
                // Failed to load initial chat
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const value = useMemo(
        () => ({
            chatSetting,
            activeChat,
            changeActiveChat,
            chatList,
            chatProfile,
            videoCall,
            voiceCall,
        }),
        [chatSetting, activeChat, changeActiveChat, chatList, chatProfile, videoCall, voiceCall]
    );

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
