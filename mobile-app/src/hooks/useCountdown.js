import { useState, useEffect, useRef } from "react";

const useCountdown = (targetDate) => {
    const target = useRef(
        targetDate
            ? new Date(targetDate)
            : (() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 4);
                  return d;
              })()
    ).current;

    const getCountdown = () => {
        const diff = target.getTime() - Date.now();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

        return {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };
    };

    const [countdown, setCountdown] = useState(getCountdown);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(getCountdown());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return countdown;
};

export default useCountdown;
