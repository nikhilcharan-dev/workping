import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

import Organization from './models/Organization.js';
import User from './models/User.js';
import Team from './models/Team.js';
import TeamMembership from './models/TeamMembership.js';
import Project from './models/Project.js';
import ProjectMember from './models/ProjectMember.js';
import ProjectTeam from './models/ProjectTeam.js';
import Attendance from './models/Attendance.js';
import Leave from './models/Leave.js';
import Holiday from './models/Holiday.js';
import Account from './models/Account.js';
import Admin from './models/Admin.js';
import OrgAdmin from './models/Admin.Org.js';
import Shift from './models/Shift.js';
import WorkStatus from './models/WorkStatus.js';
import Salary from './models/Salary.js';
import Complaint from './models/Complaint.js';
import FrsTicket from './models/FrsTicket.js';
import CLOD from './models/CL.OD.js';
import GovtProof from './models/GovtProof.js';
import Skills from './models/Skills.js';
import SocialLinks from './models/SocialLinks.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workping';
const ADMIN_EMAIL = 'admin@workping.live';
const ADMIN_PASSWORD = 'Admin@123';
const DEMO_PASSWORD = 'Demo@123';

// April 2026 working days (Mon–Fri, Apr 1–17)
const APRIL_WORKING_DAYS = [
  new Date('2026-04-01'), new Date('2026-04-02'), new Date('2026-04-03'),
  new Date('2026-04-06'), new Date('2026-04-07'), new Date('2026-04-08'),
  new Date('2026-04-09'), new Date('2026-04-10'),
  new Date('2026-04-13'), new Date('2026-04-14'), new Date('2026-04-15'),
  new Date('2026-04-16'), new Date('2026-04-17'),
];

// 13-day attendance pattern per user role (index 0=manager, 1=teamLead, 2=employee, 3=employee)
const ATTENDANCE_PATTERNS = [
  ['present','present','present','present','present','present','present','present','present','present','present','late','halfDay'],
  ['present','present','present','present','present','present','present','present','present','present','late','late','absent'],
  ['present','present','present','present','present','present','present','present','present','present','late','halfDay','absent'],
  ['present','present','present','present','present','present','present','present','present','late','late','halfDay','halfDay'],
];

const TO_WORK_STATUS = { present: 'Present', late: 'Late', halfDay: 'HalfDay', absent: 'Absent' };

const SALARY_MONTHS = [
  { month: '2026-01', daysPresent: 22, lopDays: 0, overtimeHours: 2, bonuses: 5000, status: 'paid' },
  { month: '2026-02', daysPresent: 20, lopDays: 1, overtimeHours: 0, bonuses: 0,    status: 'paid' },
  { month: '2026-03', daysPresent: 23, lopDays: 0, overtimeHours: 4, bonuses: 3000, status: 'pending' },
];

const USER_SKILLS = {
  'WPHQ-001': ['Leadership', 'Project Management', 'Product Strategy', 'Stakeholder Management'],
  'WPHQ-002': ['React', 'TypeScript', 'Code Review', 'Agile Methodology'],
  'WPHQ-003': ['Node.js', 'MongoDB', 'REST APIs', 'Docker'],
  'WPHQ-004': ['Python', 'Data Analysis', 'SQL', 'Tableau'],
  'WPLB-001': ['Innovation Management', 'Design Thinking', 'Product Roadmap', 'Team Leadership'],
  'WPLB-002': ['Machine Learning', 'Python', 'TensorFlow', 'MLOps'],
  'WPLB-003': ['NLP', 'Deep Learning', 'Data Pipeline', 'PyTorch'],
  'WPLB-004': ['Test Automation', 'Selenium', 'CI/CD', 'Shell Scripting'],
  'WPCR-001': ['Customer Success', 'CRM', 'SLA Management', 'Team Leadership'],
  'WPCR-002': ['Operations Management', 'JIRA', 'Process Improvement', 'Reporting'],
  'WPCR-003': ['Customer Support', 'Zendesk', 'Communication', 'Problem Solving'],
  'WPCR-004': ['Quality Assurance', 'Bug Tracking', 'Test Cases', 'Documentation'],
};

const USER_GOVT_PROOF = {
  'WPHQ-001': { aadhaarNumber: '234567890123', panNumber: 'AAMPM4321A', passportNumber: 'P1234567', bankAccount: '50100012345678', bankName: 'HDFC Bank',           ifscCode: 'HDFC0001234' },
  'WPHQ-002': { aadhaarNumber: '345678901234', panNumber: 'ABCNS7654B',                             bankAccount: '20123456789012', bankName: 'SBI',                  ifscCode: 'SBIN0056789' },
  'WPHQ-003': { aadhaarNumber: '456789012345', panNumber: 'AKLKI8901C',                             bankAccount: '60123456789012', bankName: 'ICICI Bank',           ifscCode: 'ICIC0007890' },
  'WPHQ-004': { aadhaarNumber: '567890123456', panNumber: 'AMNMI2345D',                             bankAccount: '11234567890123', bankName: 'Axis Bank',            ifscCode: 'AXIS0012345' },
  'WPLB-001': { aadhaarNumber: '678901234567', panNumber: 'ABPRP6789E', passportNumber: 'P7654321', bankAccount: '50234567890123', bankName: 'HDFC Bank',            ifscCode: 'HDFC0056789' },
  'WPLB-002': { aadhaarNumber: '789012345678', panNumber: 'ABCKA3456F',                             bankAccount: '20345678901234', bankName: 'SBI',                  ifscCode: 'SBIN0090123' },
  'WPLB-003': { aadhaarNumber: '890123456789', panNumber: 'ABOSB7890G',                             bankAccount: '30456789012345', bankName: 'Punjab National Bank', ifscCode: 'PUNB0012345' },
  'WPLB-004': { aadhaarNumber: '901234567890', panNumber: 'AERAR2345H',                             bankAccount: '40567890123456', bankName: 'ICICI Bank',           ifscCode: 'ICIC0056789' },
  'WPCR-001': { aadhaarNumber: '012345678901', panNumber: 'ABIPN5678I', passportNumber: 'P9876543', bankAccount: '50678901234567', bankName: 'HDFC Bank',            ifscCode: 'HDFC0090123' },
  'WPCR-002': { aadhaarNumber: '123456789012', panNumber: 'ABMDM9012J',                             bankAccount: '60789012345678', bankName: 'Axis Bank',            ifscCode: 'AXIS0056789' },
  'WPCR-003': { aadhaarNumber: '234567890124', panNumber: 'ABADA3456K',                             bankAccount: '20890123456789', bankName: 'SBI',                  ifscCode: 'SBIN0123456' },
  'WPCR-004': { aadhaarNumber: '345678901235', panNumber: 'ABVKV7890L',                             bankAccount: '30901234567890', bankName: 'Punjab National Bank', ifscCode: 'PUNB0056789' },
};

const USER_SOCIAL_LINKS = {
  'WPHQ-001': { linkedin: 'https://linkedin.com/in/aarav-mehta',      github: 'https://github.com/aaravmehta',   twitter: 'https://twitter.com/aarav_mehta' },
  'WPHQ-002': { linkedin: 'https://linkedin.com/in/neha-sharma-dev',  github: 'https://github.com/nehasharma',   portfolio: 'https://nehasharma.dev' },
  'WPHQ-003': { linkedin: 'https://linkedin.com/in/imran-khan-eng',   github: 'https://github.com/imrankhan',    portfolio: 'https://imrankhan.io' },
  'WPHQ-004': { linkedin: 'https://linkedin.com/in/meera-iyer-data',  github: 'https://github.com/meeraiyer' },
  'WPLB-001': { linkedin: 'https://linkedin.com/in/riya-patel-pm',    twitter: 'https://twitter.com/riya_patel', portfolio: 'https://riyapatel.in' },
  'WPLB-002': { linkedin: 'https://linkedin.com/in/kabir-anand-ml',   github: 'https://github.com/kabiranand',   portfolio: 'https://kabiranand.ai' },
  'WPLB-003': { linkedin: 'https://linkedin.com/in/sanya-bose-nlp',   github: 'https://github.com/sanyabose' },
  'WPLB-004': { linkedin: 'https://linkedin.com/in/arjun-roy-devops', github: 'https://github.com/arjunroy',     twitter: 'https://twitter.com/arjun_roy' },
  'WPCR-001': { linkedin: 'https://linkedin.com/in/priya-nair-cs',    twitter: 'https://twitter.com/priya_nair' },
  'WPCR-002': { linkedin: 'https://linkedin.com/in/dev-malhotra-ops', github: 'https://github.com/devmalhotra' },
  'WPCR-003': { linkedin: 'https://linkedin.com/in/ananya-das-support', instagram: 'https://instagram.com/ananya.das' },
  'WPCR-004': { linkedin: 'https://linkedin.com/in/kunal-verma-qa',   github: 'https://github.com/kunalverma' },
};

const orgBlueprints = [
  {
    key: 'hq',
    name: 'WorkPing HQ',
    type: 'Technology',
    clDays: 18,
    description: 'Central operations, leadership, and product strategy hub.',
    IPWhitelist: ['127.0.0.1', '10.0.0.0/24'],
    foundedAt: new Date('2020-01-01'),
    shift: { name: 'Morning Shift', startTime: '09:00', endTime: '18:00', breakMinutes: 60, slotStart: '08:30', slotEnd: '09:30' },
    users: [
      { name: 'Aarav Mehta',  email: 'aarav.mehta@workping.live',  phone: '8100000001', employeeId: 'WPHQ-001', gender: 'male',   role: 'manager',  workType: 'hybrid',  salary: 145000, dob: new Date('1990-04-12'), address: 'Mumbai HQ', dateOfJoining: new Date('2021-02-15') },
      { name: 'Neha Sharma',  email: 'neha.sharma@workping.live',  phone: '8100000002', employeeId: 'WPHQ-002', gender: 'female', role: 'teamLead', workType: 'onsite',  salary: 112000, dob: new Date('1992-09-21'), address: 'Mumbai HQ', dateOfJoining: new Date('2021-08-01') },
      { name: 'Imran Khan',   email: 'imran.khan@workping.live',   phone: '8100000003', employeeId: 'WPHQ-003', gender: 'male',   role: 'employee', workType: 'remote',  salary: 84000,  dob: new Date('1994-02-17'), address: 'Pune',      dateOfJoining: new Date('2022-01-10') },
      { name: 'Meera Iyer',   email: 'meera.iyer@workping.live',   phone: '8100000004', employeeId: 'WPHQ-004', gender: 'female', role: 'employee', workType: 'hybrid',  salary: 79000,  dob: new Date('1995-12-05'), address: 'Bengaluru', dateOfJoining: new Date('2023-03-14') },
    ],
    teams: [
      { teamName: 'Platform Squad', description: 'Builds the core product experiences and internal tools.', memberIndexes: [0, 1, 2] },
      { teamName: 'Growth Squad',   description: 'Handles release velocity, ops support, and adoption.',    memberIndexes: [1, 3] },
    ],
    projects: [
      { name: 'Unified Workforce Console', description: 'A flagship cross-team dashboard for leaders and HR.',           contractedBy: 'Northwind Ventures', managerIndex: 0, assignedDate: new Date('2026-01-10'), dueDate: new Date('2026-07-30'), status: 'active',  memberIndexes: [0, 1, 2, 3] },
      { name: 'AI Attendance Sentinel',    description: 'Smart attendance, policy alerts, and workforce insights.',      contractedBy: 'Aster Group',        managerIndex: 1, assignedDate: new Date('2026-02-05'), dueDate: new Date('2026-08-18'), status: 'onHold', memberIndexes: [1, 2] },
    ],
    holidays: [
      { name: 'New Quarter Kickoff', type: 'organization', date: new Date('2026-01-06'), description: 'Leadership sync and roadmap reset.' },
      { name: 'Investor Review Day', type: 'organization', date: new Date('2026-04-07'), description: 'Quarterly update and product demo prep.' },
      { name: 'Independence Day',    type: 'public',       date: new Date('2026-08-15'), description: 'National public holiday.' },
      { name: 'Year End Break',      type: 'public',       date: new Date('2026-12-25'), description: 'Year-end company break.' },
    ],
    leaves: [
      { userIndex: 2, leaveType: 'Casual', dates: [new Date('2026-04-18'), new Date('2026-04-19')], status: 'approved', approvedByIndex: 0, reason: 'Personal commitment' },
      { userIndex: 3, leaveType: 'Sick',   dates: [new Date('2026-05-03')],                         status: 'pending',                     reason: 'Medical appointment' },
      { userIndex: 1, leaveType: 'Earned', dates: [new Date('2026-03-24'), new Date('2026-03-25')], status: 'approved', approvedByIndex: 0, reason: 'Annual vacation' },
    ],
    complaints: [
      { userIndex: 2, ticketId: 'TKT-HQ-001', description: 'Attendance not syncing with the mobile app for the past 3 days.',  status: 'open' },
      { userIndex: 3, ticketId: 'TKT-HQ-002', description: 'Leave balance showing incorrect count after manager approval.',     status: 'resolved', resolvedByIndex: 0 },
    ],
    frsTickets: [
      { userIndex: 3, ticketId: 'FRS-HQ-001', description: 'Biometric device not registering checkout punches at Mumbai HQ.',  status: 'in_progress' },
    ],
    clOdEntries: [
      { userIndex: 2, date: new Date('2026-05-05'), type: 'CL', reason: 'Family function',   status: 'approved', approvedByIndex: 0 },
      { userIndex: 3, date: new Date('2026-05-12'), type: 'OD', reason: 'Client site visit', status: 'pending' },
    ],
  },
  {
    key: 'labs',
    name: 'WorkPing Labs',
    type: 'Innovation',
    clDays: 14,
    description: 'Product experimentation, AI workflows, and automation research.',
    IPWhitelist: ['127.0.0.1', '10.0.1.0/24'],
    foundedAt: new Date('2021-06-01'),
    shift: { name: 'Flex Shift', startTime: '10:00', endTime: '19:00', breakMinutes: 60, slotStart: '09:30', slotEnd: '10:30' },
    users: [
      { name: 'Riya Patel',  email: 'riya.patel@workping.live',  phone: '8100000005', employeeId: 'WPLB-001', gender: 'female', role: 'manager',  workType: 'hybrid',  salary: 138000, dob: new Date('1989-11-13'), address: 'Ahmedabad', dateOfJoining: new Date('2021-09-20') },
      { name: 'Kabir Anand', email: 'kabir.anand@workping.live', phone: '8100000006', employeeId: 'WPLB-002', gender: 'male',   role: 'teamLead', workType: 'remote',  salary: 111000, dob: new Date('1991-05-09'), address: 'Hyderabad', dateOfJoining: new Date('2022-02-12') },
      { name: 'Sanya Bose',  email: 'sanya.bose@workping.live',  phone: '8100000007', employeeId: 'WPLB-003', gender: 'female', role: 'employee', workType: 'onsite',  salary: 91000,  dob: new Date('1996-07-30'), address: 'Kolkata',   dateOfJoining: new Date('2023-06-01') },
      { name: 'Arjun Roy',   email: 'arjun.roy@workping.live',   phone: '8100000008', employeeId: 'WPLB-004', gender: 'male',   role: 'employee', workType: 'hybrid',  salary: 86000,  dob: new Date('1997-03-18'), address: 'Bengaluru', dateOfJoining: new Date('2023-09-12') },
    ],
    teams: [
      { teamName: 'AI Experiments',  description: 'Rapid prototyping for product and AI features.',         memberIndexes: [0, 1, 2] },
      { teamName: 'Automation Ops',  description: 'Internal automation, integrations, and tooling.',        memberIndexes: [1, 3] },
    ],
    projects: [
      { name: 'Smart Holiday Planner',     description: 'Predictive holiday suggestions and workforce coverage planner.', contractedBy: 'Nova Holdings',  managerIndex: 0, assignedDate: new Date('2026-02-01'), dueDate: new Date('2026-09-15'), status: 'active', memberIndexes: [0, 1, 2, 3] },
      { name: 'Attendance Anomaly Radar',  description: 'Detects outliers in attendance and timecard behavior.',          contractedBy: 'Helix Capital',  managerIndex: 1, assignedDate: new Date('2026-03-01'), dueDate: new Date('2026-10-20'), status: 'active', memberIndexes: [0, 1, 3] },
    ],
    holidays: [
      { name: 'Innovation Day',     type: 'organization', date: new Date('2026-02-11'), description: 'Demo day for product experiments.' },
      { name: 'Lab Sprint Review',  type: 'organization', date: new Date('2026-04-21'), description: 'Review of AI and automation experiments.' },
      { name: 'Independence Day',   type: 'public',       date: new Date('2026-08-15'), description: 'National public holiday.' },
      { name: 'Year End Break',     type: 'public',       date: new Date('2026-12-25'), description: 'Year-end company break.' },
    ],
    leaves: [
      { userIndex: 2, leaveType: 'Casual',  dates: [new Date('2026-04-22'), new Date('2026-04-23')], status: 'approved', approvedByIndex: 0, reason: 'Personal errand' },
      { userIndex: 3, leaveType: 'Sick',    dates: [new Date('2026-05-06')],                         status: 'pending',                     reason: 'Fever' },
      { userIndex: 1, leaveType: 'Unpaid',  dates: [new Date('2026-03-20')],                         status: 'approved', approvedByIndex: 0, reason: 'Extended travel' },
    ],
    complaints: [
      { userIndex: 2, ticketId: 'TKT-LB-001', description: 'Shift timing not reflecting updated flex schedule in the portal.',  status: 'in_review' },
      { userIndex: 3, ticketId: 'TKT-LB-002', description: 'Overtime calculation missing for last sprint delivery week.',        status: 'resolved', resolvedByIndex: 1 },
    ],
    frsTickets: [
      { userIndex: 2, ticketId: 'FRS-LB-001', description: 'FRS device offline — attendance not captured for 2 days.',          status: 'open' },
    ],
    clOdEntries: [
      { userIndex: 2, date: new Date('2026-05-06'), type: 'CL', reason: 'Personal health checkup', status: 'approved', approvedByIndex: 0 },
      { userIndex: 3, date: new Date('2026-05-14'), type: 'OD', reason: 'Conference attendance',   status: 'pending' },
    ],
  },
  {
    key: 'care',
    name: 'WorkPing Care',
    type: 'Operations',
    clDays: 12,
    description: 'Support, service delivery, customer success, and retention.',
    IPWhitelist: ['127.0.0.1', '10.0.2.0/24'],
    foundedAt: new Date('2022-04-15'),
    shift: { name: 'Support Shift', startTime: '08:00', endTime: '17:00', breakMinutes: 45, slotStart: '07:45', slotEnd: '08:30' },
    users: [
      { name: 'Priya Nair',    email: 'priya.nair@workping.live',    phone: '8100000009', employeeId: 'WPCR-001', gender: 'female', role: 'manager',  workType: 'onsite',  salary: 132000, dob: new Date('1990-08-19'), address: 'Chennai', dateOfJoining: new Date('2022-01-05') },
      { name: 'Dev Malhotra',  email: 'dev.malhotra@workping.live',  phone: '8100000010', employeeId: 'WPCR-002', gender: 'male',   role: 'teamLead', workType: 'hybrid',  salary: 109000, dob: new Date('1993-02-14'), address: 'Delhi',   dateOfJoining: new Date('2022-08-08') },
      { name: 'Ananya Das',    email: 'ananya.das@workping.live',    phone: '8100000011', employeeId: 'WPCR-003', gender: 'female', role: 'employee', workType: 'remote',  salary: 87000,  dob: new Date('1998-01-27'), address: 'Kolkata', dateOfJoining: new Date('2023-04-17') },
      { name: 'Kunal Verma',   email: 'kunal.verma@workping.live',   phone: '8100000012', employeeId: 'WPCR-004', gender: 'male',   role: 'employee', workType: 'onsite',  salary: 83000,  dob: new Date('1997-10-02'), address: 'Jaipur',  dateOfJoining: new Date('2023-11-01') },
    ],
    teams: [
      { teamName: 'Customer Success',   description: 'Customer onboarding, support, and retention.',          memberIndexes: [0, 1, 2] },
      { teamName: 'Service Operations', description: 'Issue resolution, reporting, and quality assurance.',   memberIndexes: [1, 3] },
    ],
    projects: [
      { name: 'Client Retention Cockpit', description: 'Operational dashboard for customer success teams.',     contractedBy: 'Summit Group',     managerIndex: 0, assignedDate: new Date('2026-01-20'), dueDate: new Date('2026-08-28'), status: 'active',    memberIndexes: [0, 1, 2, 3] },
      { name: 'Support SLA Monitor',      description: 'Tracks support response times and service levels.',     contractedBy: 'Vantage Partners', managerIndex: 1, assignedDate: new Date('2026-03-12'), dueDate: new Date('2026-11-01'), status: 'completed', memberIndexes: [1, 2, 3] },
    ],
    holidays: [
      { name: 'Customer Delight Day', type: 'organization', date: new Date('2026-03-19'), description: 'Team offsite and service playbook review.' },
      { name: 'Ops Retrospective',    type: 'organization', date: new Date('2026-05-09'), description: 'Operational review and planning.' },
      { name: 'Independence Day',     type: 'public',       date: new Date('2026-08-15'), description: 'National public holiday.' },
      { name: 'Year End Break',       type: 'public',       date: new Date('2026-12-25'), description: 'Year-end company break.' },
    ],
    leaves: [
      { userIndex: 2, leaveType: 'Casual', dates: [new Date('2026-04-24'), new Date('2026-04-25')], status: 'approved', approvedByIndex: 0, reason: 'Family visit' },
      { userIndex: 3, leaveType: 'Sick',   dates: [new Date('2026-05-08')],                         status: 'pending',                     reason: 'Doctor appointment' },
      { userIndex: 1, leaveType: 'Earned', dates: [new Date('2026-03-27'), new Date('2026-03-28')], status: 'approved', approvedByIndex: 0, reason: 'Planned vacation' },
    ],
    complaints: [
      { userIndex: 2, ticketId: 'TKT-CR-001', description: 'Attendance portal login failing intermittently on mobile browser.', status: 'open' },
      { userIndex: 3, ticketId: 'TKT-CR-002', description: 'SLA report export generating empty files since last update.',        status: 'resolved', resolvedByIndex: 0 },
    ],
    frsTickets: [
      { userIndex: 3, ticketId: 'FRS-CR-001', description: 'Face recognition failing due to lighting issue at workstation.',     status: 'open' },
    ],
    clOdEntries: [
      { userIndex: 2, date: new Date('2026-05-07'), type: 'CL', reason: 'Sick day',                        status: 'approved', approvedByIndex: 0 },
      { userIndex: 3, date: new Date('2026-05-19'), type: 'OD', reason: 'Client visit to Chennai office',  status: 'pending' },
    ],
  },
];

const allDemoEmails = [
  ADMIN_EMAIL,
  ...orgBlueprints.flatMap((org) => org.users.map((u) => u.email)),
];

const toAccountRole = (role) => (role === 'teamLead' ? 'teamlead' : role);

function getCheckTimes(date, status, userIndex) {
  if (status === 'absent') return { checkIn: null, checkOut: null };
  const checkIn = new Date(date);
  const checkOut = new Date(date);
  if (status === 'present') {
    checkIn.setHours(9, userIndex, 0, 0);
    checkOut.setHours(17, 30 + userIndex, 0, 0);
  } else if (status === 'late') {
    checkIn.setHours(10, 15 + userIndex, 0, 0);
    checkOut.setHours(18, 30 + userIndex, 0, 0);
  } else if (status === 'halfDay') {
    checkIn.setHours(9, 5 + userIndex, 0, 0);
    checkOut.setHours(13, 15 + userIndex, 0, 0);
  }
  return { checkIn, checkOut };
}

function computeSalary(baseSalary, daysPresent, lopDays, overtimeHours, bonuses) {
  const dailyRate = Math.round(baseSalary / 26);
  const earnedBase = Math.round(dailyRate * daysPresent);
  const lopDeduction = Math.round(lopDays * dailyRate);
  const overtimePay = Math.round((baseSalary / (26 * 8)) * overtimeHours * 1.5);
  const gross = earnedBase + overtimePay + bonuses;
  const tax = Math.round(gross * 0.1);
  const netSalary = gross - lopDeduction - tax;
  return { deductions: lopDeduction, tax, netSalary };
}

const ALL_DEMO_EMPLOYEE_IDS = [
  'WPHQ-001', 'WPHQ-002', 'WPHQ-003', 'WPHQ-004',
  'WPLB-001', 'WPLB-002', 'WPLB-003', 'WPLB-004',
  'WPCR-001', 'WPCR-002', 'WPCR-003', 'WPCR-004',
];

async function cleanupDemoData() {
  const existingDemoOrgIds = await Organization.find({
    name: { $in: orgBlueprints.map((o) => o.name) },
  }).distinct('_id');

  const allUserEmails = allDemoEmails.filter((e) => e !== ADMIN_EMAIL);
  const existingUserIds = await User.find({
    $or: [
      { email: { $in: allUserEmails } },
      { employeeId: { $in: ALL_DEMO_EMPLOYEE_IDS } },
    ],
  }).distinct('_id');

  await Promise.all([
    Account.deleteMany({ email: { $in: [...allDemoEmails, 'admin@workping.com', 'aarav.mehta@workping.com', 'neha.sharma@workping.com', 'imran.khan@workping.com', 'meera.iyer@workping.com', 'riya.patel@workping.com', 'kabir.anand@workping.com', 'sanya.bose@workping.com', 'arjun.roy@workping.com', 'priya.nair@workping.com', 'dev.malhotra@workping.com', 'ananya.das@workping.com', 'kunal.verma@workping.com'] } }),
    Admin.deleteMany({ email: { $in: [ADMIN_EMAIL, 'admin@workping.com'] } }),
    User.deleteMany({ $or: [{ email: { $in: allUserEmails } }, { employeeId: { $in: ALL_DEMO_EMPLOYEE_IDS } }] }),
    OrgAdmin.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    TeamMembership.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Attendance.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Leave.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Holiday.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Shift.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    WorkStatus.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Salary.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Complaint.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    FrsTicket.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    CLOD.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    GovtProof.deleteMany({ userId: { $in: existingUserIds } }),
    Skills.deleteMany({ userId: { $in: existingUserIds } }),
    SocialLinks.deleteMany({ userId: { $in: existingUserIds } }),
    ProjectTeam.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    ProjectMember.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Project.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Team.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Organization.deleteMany({ name: { $in: orgBlueprints.map((o) => o.name) } }),
  ]);
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  await cleanupDemoData();
  console.log('Cleaned up previous demo data.');

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const employeePasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await Account.create({
    role: 'admin',
    email: ADMIN_EMAIL,
    password: adminPasswordHash,
    emailVerified: true,
    twoFactorEnabled: true,
  });

  const adminProfile = await Admin.create({
    name: 'Admin User',
    email: ADMIN_EMAIL,
    emailVerified: true,
    phoneNumber: '7815873262',
    profileImage: null,
  });

  const createdOrgs = [];

  for (const blueprint of orgBlueprints) {
    const org = await Organization.create({
      name: blueprint.name,
      type: blueprint.type,
      clDays: blueprint.clDays,
      description: blueprint.description,
      IPWhitelist: blueprint.IPWhitelist,
      foundedAt: blueprint.foundedAt,
    });
    createdOrgs.push(org);

    await OrgAdmin.create({ organizationId: org._id, primaryAdmin: adminProfile._id });

    const shift = await Shift.create({ ...blueprint.shift, organizationId: org._id });

    // ── Users + profile data ──────────────────────────────────────────────────
    const users = [];
    for (const ub of blueprint.users) {
      await Account.create({
        role: toAccountRole(ub.role),
        email: ub.email,
        password: employeePasswordHash,
        emailVerified: true,
        twoFactorEnabled: false,
      });

      const user = await User.create({
        name: ub.name, email: ub.email, phone: ub.phone, employeeId: ub.employeeId,
        gender: ub.gender, organizationId: org._id, profileImage: null,
        salary: ub.salary, dob: ub.dob, address: ub.address,
        dateOfJoining: ub.dateOfJoining, role: ub.role, isActive: true, workType: ub.workType,
      });
      users.push(user);

      const proof = USER_GOVT_PROOF[ub.employeeId];
      if (proof) await GovtProof.create({ userId: user._id, ...proof });

      for (const skillName of (USER_SKILLS[ub.employeeId] || [])) {
        await Skills.create({ userId: user._id, skillName });
      }

      const links = USER_SOCIAL_LINKS[ub.employeeId];
      if (links) await SocialLinks.create({ userId: user._id, ...links });
    }

    // ── Teams ─────────────────────────────────────────────────────────────────
    for (const tb of blueprint.teams) {
      const team = await Team.create({
        teamName: tb.teamName, description: tb.description,
        organizationId: org._id, managerId: users[0]._id, leaderIds: [users[1]._id],
      });
      for (const idx of tb.memberIndexes) {
        await TeamMembership.create({
          userId: users[idx]._id, teamId: team._id,
          organizationId: org._id, joinedAt: new Date('2026-01-01'), isActive: true,
        });
        await User.updateOne(
          { _id: users[idx]._id, $or: [{ teamId: null }, { teamId: { $exists: false } }] },
          { $set: { teamId: team._id } }
        );
      }
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    const projects = [];
    for (const pb of blueprint.projects) {
      const pm = users[pb.managerIndex];
      const project = await Project.create({
        name: pb.name, description: pb.description, organizationId: org._id,
        projectManager: pm._id, assignedDate: pb.assignedDate, dueDate: pb.dueDate,
        contractedBy: pb.contractedBy, status: pb.status, shiftId: shift._id,
      });
      projects.push(project);

      await ProjectTeam.create({
        teamName: `${pb.name} Team`,
        description: `Delivery pod for ${pb.name}`,
        projectId: project._id, organizationId: org._id,
        teamManagerId: pm._id, teamLeaderId: users[1]._id,
        users: pb.memberIndexes.map((i) => users[i]._id),
      });

      for (const idx of pb.memberIndexes) {
        await ProjectMember.create({
          projectId: project._id, userId: users[idx]._id,
          organizationId: org._id, assignedDate: pb.assignedDate, isActive: true,
        });
      }
    }

    // ── Holidays ──────────────────────────────────────────────────────────────
    for (const hb of blueprint.holidays) {
      await Holiday.create({
        organizationId: org._id, name: hb.name, type: hb.type,
        date: hb.date, isWorkingDay: false, description: hb.description,
      });
    }

    // ── Attendance + WorkStatus ───────────────────────────────────────────────
    for (const [ui, user] of users.entries()) {
      const pattern = ATTENDANCE_PATTERNS[ui];
      for (const [di, date] of APRIL_WORKING_DAYS.entries()) {
        const status = pattern[di];
        const { checkIn, checkOut } = getCheckTimes(date, status, ui);
        const attendanceDoc = {
          userId: user._id, organizationId: org._id,
          projectId: projects[0]._id, date, status, remarks: 'April attendance record',
        };
        if (checkIn) { attendanceDoc.checkIn = checkIn; attendanceDoc.checkOut = checkOut; }
        await Attendance.create(attendanceDoc);

        await WorkStatus.create({
          userId: user._id, organizationId: org._id,
          date, type: 'WD', shiftId: shift._id, status: TO_WORK_STATUS[status],
        });
      }
    }

    // ── Leave ─────────────────────────────────────────────────────────────────
    for (const lb of blueprint.leaves) {
      await Leave.create({
        userId: users[lb.userIndex]._id, organizationId: org._id,
        leaveType: lb.leaveType, dates: lb.dates, status: lb.status,
        appliedBy: users[lb.userIndex]._id,
        approvedBy: lb.approvedByIndex != null ? users[lb.approvedByIndex]._id : undefined,
        reason: lb.reason,
      });
    }

    // ── Salary (Jan–Mar 2026) ─────────────────────────────────────────────────
    for (const user of users) {
      for (const mc of SALARY_MONTHS) {
        const { deductions, tax, netSalary } = computeSalary(
          user.salary, mc.daysPresent, mc.lopDays, mc.overtimeHours, mc.bonuses
        );
        await Salary.create({
          userId: user._id, organizationId: org._id, role: user.role,
          month: mc.month, daysPresent: mc.daysPresent, lopDays: mc.lopDays,
          overtimeHours: mc.overtimeHours, baseSalary: user.salary,
          bonuses: mc.bonuses, deductions, tax, netSalary,
          status: mc.status, generatedDate: new Date(`${mc.month}-28`),
        });
      }
    }

    // ── Complaints ────────────────────────────────────────────────────────────
    for (const c of blueprint.complaints) {
      await Complaint.create({
        userId: users[c.userIndex]._id, organizationId: org._id,
        ticketId: c.ticketId, description: c.description, status: c.status,
        resolvedBy: c.resolvedByIndex != null ? users[c.resolvedByIndex]._id : undefined,
      });
    }

    // ── FRS Tickets ───────────────────────────────────────────────────────────
    for (const f of blueprint.frsTickets) {
      await FrsTicket.create({
        userId: users[f.userIndex]._id, organizationId: org._id,
        ticketId: f.ticketId, description: f.description, status: f.status,
      });
    }

    // ── CL/OD Entries ─────────────────────────────────────────────────────────
    for (const e of blueprint.clOdEntries) {
      await CLOD.create({
        userId: users[e.userIndex]._id, organizationId: org._id,
        date: e.date, type: e.type, reason: e.reason, status: e.status,
        approvedBy: e.approvedByIndex != null ? users[e.approvedByIndex]._id : undefined,
      });
    }

    console.log(`✅ Seeded: ${org.name}`);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('             SEEDING COMPLETE              ');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('ADMIN LOGIN');
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('MANAGER LOGIN  (WorkPing HQ)');
  console.log('  Email    : aarav.mehta@workping.live');
  console.log(`  Password : ${DEMO_PASSWORD}`);
  console.log('');
  console.log('EMPLOYEE LOGIN  (WorkPing HQ)');
  console.log('  Email    : imran.khan@workping.live');
  console.log(`  Password : ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Schemas seeded: Organization, User, Account, Admin, OrgAdmin,');
  console.log('  Team, TeamMembership, Project, ProjectTeam, ProjectMember,');
  console.log('  Shift, Attendance, WorkStatus, Leave, Holiday,');
  console.log('  Salary, Complaint, FrsTicket, CL_OD,');
  console.log('  GovtProof, Skills, SocialLinks');
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
