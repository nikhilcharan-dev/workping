import { useState, useCallback } from "react";
import { formatFileSize } from "@/utils/other";

const useFileUploader = (showPreview = true) => {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleAcceptedFiles = useCallback((files) => {
        const allFiles = files.map((file) => ({
            ...file,
            preview: file.uri || "",
            formattedSize: formatFileSize(file.size || 0),
        }));
        setSelectedFiles((prev) => [...prev, ...allFiles]);
    }, []);

    const removeFile = useCallback((file) => {
        setSelectedFiles((prev) => prev.filter((f) => f.uri !== file.uri));
    }, []);

    return { selectedFiles, handleAcceptedFiles, removeFile };
};

export default useFileUploader;
