import { addOrSubtractDaysFromDate } from "@/utils/date";

const smImg3 = require("@/assets/images/small/img-3.jpg");
const smImg4 = require("@/assets/images/small/img-4.jpg");
const smImg6 = require("@/assets/images/small/img-6.jpg");
const avatar1 = require("@/assets/images/users/avatar-1.jpg");
const avatar3 = require("@/assets/images/users/avatar-3.jpg");
const avatar5 = require("@/assets/images/users/avatar-5.jpg");
const avatar6 = require("@/assets/images/users/avatar-6.jpg");
const avatar7 = require("@/assets/images/users/avatar-7.jpg");

// Brand SVGs not directly supported in RN - use null placeholder
const brandPlaceholder = null;

export const appsData = [
    { image: brandPlaceholder, name: "Github", handle: "@workping" },
    { image: brandPlaceholder, name: "Bitbucket", handle: "@workping" },
    { image: brandPlaceholder, name: "Dribble", handle: "@username" },
    { image: brandPlaceholder, name: "Dropbox", handle: "@username" },
    { image: brandPlaceholder, name: "Slack", handle: "@workping" },
];

export const notificationsData = [
    {
        from: "Josephine Thompson",
        content: 'commented on admin panel "Wow! this admin looks good and awesome design"',
        icon: avatar1,
    },
    { from: "Donoghue Susan", content: "Hi, How are you? What about our next meeting", icon: avatar6 },
    { from: "Jacob Gines", content: "Answered to your comment on the cash flow forecast's graph.", icon: avatar3 },
    { from: "Shawn Bunch", content: "Commented on Admin", icon: avatar5 },
    { from: "Vanessa R. Davis", content: "Delivery processing your order is being shipped", icon: avatar7 },
];

export const activityStreamData = [
    {
        title: "Report-Fix / Update",
        variant: "danger",
        type: "task",
        files: [{ name: "Concept.fig" }, { name: "workping.docs" }],
        time: addOrSubtractDaysFromDate(0),
    },
    {
        title: "Project Status",
        files: [{ name: "UI/UX Figma Design.fig" }],
        variant: "success",
        type: "design",
        status: "completed",
        time: addOrSubtractDaysFromDate(1),
    },
    {
        title: "WorkPing Application UI v2.0.0",
        variant: "primary",
        content:
            "Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order E-commerce & Marketing pages.",
        files: [{ name: "Backup.zip" }],
        status: "latest",
        time: addOrSubtractDaysFromDate(3),
    },
    {
        title: "Alex Smith Attached Photos",
        icon: avatar7,
        time: addOrSubtractDaysFromDate(4),
        files: [{ preview: smImg6 }, { preview: smImg3 }, { preview: smImg4 }],
    },
    {
        title: "Rebecca J. added a new team member",
        icon: avatar6,
        time: addOrSubtractDaysFromDate(4),
        content: "Added a new member to Front Dashboard",
    },
    {
        title: "Achievements",
        variant: "warning",
        type: "achievement",
        time: addOrSubtractDaysFromDate(5),
        content: 'Earned a "Best Product Award"',
    },
];
