import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

import Organization from "./models/Organization.js";
import User from "./models/User.js";
import Team from "./models/Team.js";
import TeamMembership from "./models/TeamMembership.js";
import Project from "./models/Project.js";
import ProjectMember from "./models/ProjectMember.js";
import ProjectTeam from "./models/ProjectTeam.js";
import Attendance from "./models/Attendance.js";
import Leave from "./models/Leave.js";
import Holiday from "./models/Holiday.js";
import Account from "./models/Account.js";
import Admin from "./models/Admin.js";
import OrgAdmin from "./models/Admin.Org.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/workping";
const ADMIN_EMAIL = "admin@workping.com";
const ADMIN_PASSWORD = "Admin@123";
const DEMO_PASSWORD = "Demo@123";

const orgBlueprints = [
  {
    key: "hq",
    name: "WorkPing HQ",
    type: "Technology",
    clDays: 18,
    description: "Central operations, leadership, and product strategy hub.",
    IPWhitelist: ["127.0.0.1", "10.0.0.0/24"],
    foundedAt: new Date("2020-01-01"),
    users: [
      {
        name: "Aarav Mehta",
        email: "aarav.mehta@workping.com",
        phone: "7000000001",
        employeeId: "WPHQ-001",
        gender: "male",
        role: "manager",
        workType: "hybrid",
        salary: 145000,
        dob: new Date("1990-04-12"),
        address: "Mumbai HQ",
        dateOfJoining: new Date("2021-02-15"),
      },
      {
        name: "Neha Sharma",
        email: "neha.sharma@workping.com",
        phone: "7000000002",
        employeeId: "WPHQ-002",
        gender: "female",
        role: "teamLead",
        workType: "onsite",
        salary: 112000,
        dob: new Date("1992-09-21"),
        address: "Mumbai HQ",
        dateOfJoining: new Date("2021-08-01"),
      },
      {
        name: "Imran Khan",
        email: "imran.khan@workping.com",
        phone: "7000000003",
        employeeId: "WPHQ-003",
        gender: "male",
        role: "employee",
        workType: "remote",
        salary: 84000,
        dob: new Date("1994-02-17"),
        address: "Pune",
        dateOfJoining: new Date("2022-01-10"),
      },
      {
        name: "Meera Iyer",
        email: "meera.iyer@workping.com",
        phone: "7000000004",
        employeeId: "WPHQ-004",
        gender: "female",
        role: "employee",
        workType: "hybrid",
        salary: 79000,
        dob: new Date("1995-12-05"),
        address: "Bengaluru",
        dateOfJoining: new Date("2023-03-14"),
      },
    ],
    teams: [
      {
        teamName: "Platform Squad",
        description: "Builds the core product experiences and internal tools.",
        memberIndexes: [0, 1, 2],
      },
      {
        teamName: "Growth Squad",
        description: "Handles release velocity, ops support, and adoption.",
        memberIndexes: [1, 3],
      },
    ],
    projects: [
      {
        name: "Unified Workforce Console",
        description: "A flagship cross-team dashboard for leaders and HR.",
        contractedBy: "Northwind Ventures",
        managerIndex: 0,
        assignedDate: new Date("2026-01-10"),
        dueDate: new Date("2026-07-30"),
        status: "active",
        memberIndexes: [0, 1, 2, 3],
      },
      {
        name: "AI Attendance Sentinel",
        description: "Smart attendance, policy alerts, and workforce insights.",
        contractedBy: "Aster Group",
        managerIndex: 1,
        assignedDate: new Date("2026-02-05"),
        dueDate: new Date("2026-08-18"),
        status: "onHold",
        memberIndexes: [1, 2],
      },
    ],
    holidays: [
      {
        name: "New Quarter Kickoff",
        type: "organization",
        date: new Date("2026-01-06"),
        description: "Leadership sync and roadmap reset.",
      },
      {
        name: "Investor Review Day",
        type: "organization",
        date: new Date("2026-04-07"),
        description: "Quarterly update and product demo prep.",
      },
      {
        name: "Independence Day",
        type: "public",
        date: new Date("2026-08-15"),
        description: "National public holiday.",
      },
      { name: "Year End Break", type: "public", date: new Date("2026-12-25"), description: "Year-end company break." },
    ],
  },
  {
    key: "labs",
    name: "WorkPing Labs",
    type: "Innovation",
    clDays: 14,
    description: "Product experimentation, AI workflows, and automation research.",
    IPWhitelist: ["127.0.0.1", "10.0.1.0/24"],
    foundedAt: new Date("2021-06-01"),
    users: [
      {
        name: "Riya Patel",
        email: "riya.patel@workping.com",
        phone: "7000000005",
        employeeId: "WPLB-001",
        gender: "female",
        role: "manager",
        workType: "hybrid",
        salary: 138000,
        dob: new Date("1989-11-13"),
        address: "Ahmedabad",
        dateOfJoining: new Date("2021-09-20"),
      },
      {
        name: "Kabir Anand",
        email: "kabir.anand@workping.com",
        phone: "7000000006",
        employeeId: "WPLB-002",
        gender: "male",
        role: "teamLead",
        workType: "remote",
        salary: 111000,
        dob: new Date("1991-05-09"),
        address: "Hyderabad",
        dateOfJoining: new Date("2022-02-12"),
      },
      {
        name: "Sanya Bose",
        email: "sanya.bose@workping.com",
        phone: "7000000007",
        employeeId: "WPLB-003",
        gender: "female",
        role: "employee",
        workType: "onsite",
        salary: 91000,
        dob: new Date("1996-07-30"),
        address: "Kolkata",
        dateOfJoining: new Date("2023-06-01"),
      },
      {
        name: "Arjun Roy",
        email: "arjun.roy@workping.com",
        phone: "7000000008",
        employeeId: "WPLB-004",
        gender: "male",
        role: "employee",
        workType: "hybrid",
        salary: 86000,
        dob: new Date("1997-03-18"),
        address: "Bengaluru",
        dateOfJoining: new Date("2023-09-12"),
      },
    ],
    teams: [
      {
        teamName: "AI Experiments",
        description: "Rapid prototyping for product and AI features.",
        memberIndexes: [0, 1, 2],
      },
      {
        teamName: "Automation Ops",
        description: "Internal automation, integrations, and tooling.",
        memberIndexes: [1, 3],
      },
    ],
    projects: [
      {
        name: "Smart Holiday Planner",
        description: "Predictive holiday suggestions and workforce coverage planner.",
        contractedBy: "Nova Holdings",
        managerIndex: 0,
        assignedDate: new Date("2026-02-01"),
        dueDate: new Date("2026-09-15"),
        status: "active",
        memberIndexes: [0, 1, 2, 3],
      },
      {
        name: "Attendance Anomaly Radar",
        description: "Detects outliers in attendance and timecard behavior.",
        contractedBy: "Helix Capital",
        managerIndex: 1,
        assignedDate: new Date("2026-03-01"),
        dueDate: new Date("2026-10-20"),
        status: "active",
        memberIndexes: [0, 1, 3],
      },
    ],
    holidays: [
      {
        name: "Innovation Day",
        type: "organization",
        date: new Date("2026-02-11"),
        description: "Demo day for product experiments.",
      },
      {
        name: "Lab Sprint Review",
        type: "organization",
        date: new Date("2026-04-21"),
        description: "Review of AI and automation experiments.",
      },
      {
        name: "Independence Day",
        type: "public",
        date: new Date("2026-08-15"),
        description: "National public holiday.",
      },
      { name: "Year End Break", type: "public", date: new Date("2026-12-25"), description: "Year-end company break." },
    ],
  },
  {
    key: "care",
    name: "WorkPing Care",
    type: "Operations",
    clDays: 12,
    description: "Support, service delivery, customer success, and retention.",
    IPWhitelist: ["127.0.0.1", "10.0.2.0/24"],
    foundedAt: new Date("2022-04-15"),
    users: [
      {
        name: "Priya Nair",
        email: "priya.nair@workping.com",
        phone: "7000000009",
        employeeId: "WPCR-001",
        gender: "female",
        role: "manager",
        workType: "onsite",
        salary: 132000,
        dob: new Date("1990-08-19"),
        address: "Chennai",
        dateOfJoining: new Date("2022-01-05"),
      },
      {
        name: "Dev Malhotra",
        email: "dev.malhotra@workping.com",
        phone: "7000000010",
        employeeId: "WPCR-002",
        gender: "male",
        role: "teamLead",
        workType: "hybrid",
        salary: 109000,
        dob: new Date("1993-02-14"),
        address: "Delhi",
        dateOfJoining: new Date("2022-08-08"),
      },
      {
        name: "Ananya Das",
        email: "ananya.das@workping.com",
        phone: "7000000011",
        employeeId: "WPCR-003",
        gender: "female",
        role: "employee",
        workType: "remote",
        salary: 87000,
        dob: new Date("1998-01-27"),
        address: "Kolkata",
        dateOfJoining: new Date("2023-04-17"),
      },
      {
        name: "Kunal Verma",
        email: "kunal.verma@workping.com",
        phone: "7000000012",
        employeeId: "WPCR-004",
        gender: "male",
        role: "employee",
        workType: "onsite",
        salary: 83000,
        dob: new Date("1997-10-02"),
        address: "Jaipur",
        dateOfJoining: new Date("2023-11-01"),
      },
    ],
    teams: [
      {
        teamName: "Customer Success",
        description: "Customer onboarding, support, and retention.",
        memberIndexes: [0, 1, 2],
      },
      {
        teamName: "Service Operations",
        description: "Issue resolution, reporting, and quality assurance.",
        memberIndexes: [1, 3],
      },
    ],
    projects: [
      {
        name: "Client Retention Cockpit",
        description: "Operational dashboard for customer success teams.",
        contractedBy: "Summit Group",
        managerIndex: 0,
        assignedDate: new Date("2026-01-20"),
        dueDate: new Date("2026-08-28"),
        status: "active",
        memberIndexes: [0, 1, 2, 3],
      },
      {
        name: "Support SLA Monitor",
        description: "Tracks support response times and service levels.",
        contractedBy: "Vantage Partners",
        managerIndex: 1,
        assignedDate: new Date("2026-03-12"),
        dueDate: new Date("2026-11-01"),
        status: "completed",
        memberIndexes: [1, 2, 3],
      },
    ],
    holidays: [
      {
        name: "Customer Delight Day",
        type: "organization",
        date: new Date("2026-03-19"),
        description: "Team offsite and service playbook review.",
      },
      {
        name: "Ops Retrospective",
        type: "organization",
        date: new Date("2026-05-09"),
        description: "Operational review and planning.",
      },
      {
        name: "Independence Day",
        type: "public",
        date: new Date("2026-08-15"),
        description: "National public holiday.",
      },
      { name: "Year End Break", type: "public", date: new Date("2026-12-25"), description: "Year-end company break." },
    ],
  },
];

const allDemoEmails = [ADMIN_EMAIL, ...orgBlueprints.flatMap((org) => org.users.map((user) => user.email))];

const toAccountRole = (role) => {
  if (role === "teamLead") return "teamlead";
  return role;
};

const makeDateAt = (date, hours, minutes) => {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const shiftDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

async function cleanupDemoData() {
  const existingDemoOrgIds = await Organization.find({ name: { $in: orgBlueprints.map((org) => org.name) } }).distinct(
    "_id"
  );

  await Promise.all([
    Account.deleteMany({ email: { $in: allDemoEmails } }),
    Admin.deleteMany({ email: ADMIN_EMAIL }),
    User.deleteMany({ email: { $in: allDemoEmails.filter((email) => email !== ADMIN_EMAIL) } }),
    OrgAdmin.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    TeamMembership.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Attendance.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Leave.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Holiday.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    ProjectTeam.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    ProjectMember.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Project.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Team.deleteMany({ organizationId: { $in: existingDemoOrgIds } }),
    Organization.deleteMany({ name: { $in: orgBlueprints.map((org) => org.name) } }),
  ]);
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  await cleanupDemoData();
  console.log("Cleaned up previous demo data.");

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const employeePasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await Account.create({
    role: "admin",
    email: ADMIN_EMAIL,
    password: adminPasswordHash,
    emailVerified: true,
    twoFactorEnabled: true,
  });

  const adminProfile = await Admin.create({
    name: "Admin User",
    email: ADMIN_EMAIL,
    emailVerified: true,
    phoneNumber: "7815873262",
    profileImage: null,
  });

  const createdOrgs = [];
  const createdUsersByOrg = new Map();
  const createdTeamsByOrg = new Map();
  const createdProjectsByOrg = new Map();

  for (const orgBlueprint of orgBlueprints) {
    const org = await Organization.create({
      name: orgBlueprint.name,
      type: orgBlueprint.type,
      clDays: orgBlueprint.clDays,
      description: orgBlueprint.description,
      IPWhitelist: orgBlueprint.IPWhitelist,
      foundedAt: orgBlueprint.foundedAt,
    });

    createdOrgs.push(org);
    await OrgAdmin.create({
      organizationId: org._id,
      primaryAdmin: adminProfile._id,
    });

    const users = [];
    for (const [index, userBlueprint] of orgBlueprint.users.entries()) {
      await Account.create({
        role: toAccountRole(userBlueprint.role),
        email: userBlueprint.email,
        password: employeePasswordHash,
        emailVerified: true,
        twoFactorEnabled: false,
      });

      const user = await User.create({
        name: userBlueprint.name,
        email: userBlueprint.email,
        phone: userBlueprint.phone,
        employeeId: userBlueprint.employeeId,
        gender: userBlueprint.gender,
        organizationId: org._id,
        profileImage: null,
        salary: userBlueprint.salary,
        dob: userBlueprint.dob,
        address: userBlueprint.address,
        dateOfJoining: userBlueprint.dateOfJoining,
        role: userBlueprint.role,
        isActive: true,
        workType: userBlueprint.workType,
      });

      users.push(user);
    }

    createdUsersByOrg.set(orgBlueprint.key, users);

    const teams = [];
    for (const teamBlueprint of orgBlueprint.teams) {
      const team = await Team.create({
        teamName: teamBlueprint.teamName,
        description: teamBlueprint.description,
        organizationId: org._id,
        managerId: users[0]._id,
        leaderIds: [users[1]._id],
      });

      teams.push(team);

      const teamMemberIds = teamBlueprint.memberIndexes.map((memberIndex) => users[memberIndex]._id);
      for (const memberId of teamMemberIds) {
        await TeamMembership.create({
          userId: memberId,
          teamId: team._id,
          organizationId: org._id,
          joinedAt: new Date("2026-01-01"),
          isActive: true,
        });

        // Sync teamId to User document (only set if not already assigned to a team)
        await User.updateOne(
          { _id: memberId, $or: [{ teamId: null }, { teamId: { $exists: false } }] },
          { $set: { teamId: team._id } }
        );
      }
    }

    createdTeamsByOrg.set(orgBlueprint.key, teams);

    const projects = [];
    for (const projectBlueprint of orgBlueprint.projects) {
      const projectManager = users[projectBlueprint.managerIndex];
      const project = await Project.create({
        name: projectBlueprint.name,
        description: projectBlueprint.description,
        organizationId: org._id,
        projectManager: projectManager._id,
        assignedDate: projectBlueprint.assignedDate,
        dueDate: projectBlueprint.dueDate,
        contractedBy: projectBlueprint.contractedBy,
        status: projectBlueprint.status,
      });

      projects.push(project);

      await ProjectTeam.create({
        teamName: `${projectBlueprint.name} Team`,
        description: `Delivery pod for ${projectBlueprint.name}`,
        projectId: project._id,
        organizationId: org._id,
        teamManagerId: projectManager._id,
        teamLeaderId: users[1]._id,
        users: projectBlueprint.memberIndexes.map((memberIndex) => users[memberIndex]._id),
      });

      // Create individual ProjectMember records (used by getMyProjects API)
      for (const memberIndex of projectBlueprint.memberIndexes) {
        await ProjectMember.create({
          projectId: project._id,
          userId: users[memberIndex]._id,
          organizationId: org._id,
          assignedDate: projectBlueprint.assignedDate,
          isActive: true,
        });
      }
    }

    createdProjectsByOrg.set(orgBlueprint.key, projects);

    for (const holidayBlueprint of orgBlueprint.holidays) {
      await Holiday.create({
        organizationId: org._id,
        name: holidayBlueprint.name,
        type: holidayBlueprint.type,
        date: holidayBlueprint.date,
        isWorkingDay: false,
        description: holidayBlueprint.description,
      });
    }

    const attendanceStatusCycle = ["present", "late", "present", "halfDay"];
    const attendanceUsers = users.slice(0, 3);
    for (const [userIndex, user] of attendanceUsers.entries()) {
      for (let dayOffset = 1; dayOffset <= 4; dayOffset += 1) {
        const attendanceDate = shiftDays(new Date("2026-04-07"), -dayOffset - userIndex);
        await Attendance.create({
          userId: user._id,
          organizationId: org._id,
          date: attendanceDate,
          status: attendanceStatusCycle[(dayOffset + userIndex) % attendanceStatusCycle.length],
          checkIn: makeDateAt(attendanceDate, 9 + (userIndex % 2), 10 + dayOffset),
          checkOut: makeDateAt(attendanceDate, 17 + (userIndex % 2), 20 - dayOffset),
          remarks: "Demo attendance record",
        });
      }
    }

    await Leave.create({
      userId: users[2]._id,
      organizationId: org._id,
      leaveType: "Casual",
      dates: [new Date("2026-04-18"), new Date("2026-04-19")],
      status: "approved",
      appliedBy: users[2]._id,
      approvedBy: users[0]._id,
      reason: "Personal commitment",
    });

    await Leave.create({
      userId: users[3]._id,
      organizationId: org._id,
      leaveType: "Sick",
      dates: [new Date("2026-05-03")],
      status: "pending",
      appliedBy: users[3]._id,
      reason: "Medical appointment",
    });
  }

  console.log("--- SEEDING COMPLETE ---");
  console.log(`✅ Admin created: ${ADMIN_EMAIL}`);
  console.log("✅ Password: Admin@123");
  console.log(`✅ Organizations created: ${createdOrgs.length}`);
  console.log(`✅ Teams created: ${Array.from(createdTeamsByOrg.values()).flat().length}`);
  console.log(`✅ Projects created: ${Array.from(createdProjectsByOrg.values()).flat().length}`);
  console.log("✅ Demo holidays, attendance, and leave data added.");
  console.log("");
  console.log("Use the admin account to present the investor demo:");
  console.log("Email: admin@workping.com");
  console.log("Password: Admin@123");
  console.log("-------------------------");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
