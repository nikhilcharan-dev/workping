import {
    getOrganizationById,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    getOrganizationsOfAdmin,
    getOrganizationIDsOfAdmin,
    getOrgAdmins,
    findAdminByEmail,
    inviteAdmin,
    removeAdmin,
    uploadOrgLogo,
} from "#webController/admin/organization/controller.js";
import express from "express";
import multer from "multer";
const Router = express.Router();
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

Router.get("/", getOrganizationsOfAdmin);
Router.get("/get-organizations", getOrganizationsOfAdmin);
Router.get("/get-organization-by-id/:id", getOrganizationById);
Router.get("/get-all-organization-ids", getOrganizationIDsOfAdmin);
Router.get("/get-org-admins", getOrgAdmins);
Router.post("/add-organization", addOrganization);
Router.post("/update-organization", updateOrganization);
Router.post("/delete-organizations", deleteOrganization);
Router.post("/find-admin-by-email", findAdminByEmail);
Router.post("/invite-admin", inviteAdmin);
Router.post("/remove-admin", removeAdmin);
Router.post("/upload-logo", logoUpload.single("logo"), uploadOrgLogo);

export default Router;
