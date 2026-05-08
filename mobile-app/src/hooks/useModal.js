import { useState, useCallback } from "react";

const useModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [size, setSize] = useState(null);
    const [style, setStyle] = useState(null);
    const [scrollable, setScrollable] = useState(false);

    const toggleModal = useCallback(() => {
        setIsOpen((prev) => !prev);
        setSize(null);
        setStyle(null);
        setScrollable(false);
    }, []);

    const openModalWithSize = useCallback((s) => {
        setSize(s);
        setIsOpen(true);
    }, []);

    const openModalWithStyle = useCallback((s) => {
        setStyle(s);
        setIsOpen(true);
    }, []);

    const openModalWithScroll = useCallback(() => {
        setScrollable(true);
        setIsOpen(true);
    }, []);

    return { isOpen, size, style, scrollable, toggleModal, openModalWithSize, openModalWithStyle, openModalWithScroll };
};

export default useModal;
