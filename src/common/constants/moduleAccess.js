const MODULE_ACCESS_GROUPS = [
  {
    key: "COMMON",
    label: "Common access",
    modules: [
      { key: "DASHBOARD", label: "Dashboard", description: "View the role dashboard", locked: true },
      { key: "NOTIFICATIONS", label: "Notifications", description: "View account notifications", locked: true },
      { key: "PROFILE", label: "Profile", description: "View and update profile details", locked: true },
      { key: "SETTINGS", label: "Settings", description: "Manage account settings", locked: true },
    ],
  },
  {
    key: "ACADEMIC",
    label: "Academic operations",
    modules: [
      { key: "STUDENT_MANAGEMENT", label: "Student Management", description: "Manage students and course records" },
      { key: "ACADEMIC_OPERATIONS", label: "Academic Operations", description: "Manage courses, batches and academic workflows" },
      { key: "FEE_ACCOUNTS", label: "Fee & Accounts", description: "Manage payments, installments and account records" },
      { key: "REPORTS_ANALYTICS", label: "Reports & Analytics", description: "View and download operational reports" },
      { key: "HELPDESK_SUPPORT", label: "Helpdesk & Support", description: "Manage support requests" },
    ],
  },
  {
    key: "SALES_CRM",
    label: "Sales CRM",
    modules: [
      { key: "LEAD_MANAGEMENT", label: "Lead Management", description: "Manage leads and follow-ups" },
      { key: "ADMISSION_MANAGEMENT", label: "Admission Management", description: "Manage admissions and conversions" },
      { key: "SALES_CRM_REPORTS", label: "Sales CRM Reports", description: "View sales and conversion reports" },
    ],
  },
];

const COMMON_MODULE_KEYS = MODULE_ACCESS_GROUPS[0].modules.map((module) => module.key);
const ACADEMIC_MODULE_KEYS = MODULE_ACCESS_GROUPS.find((group) => group.key === "ACADEMIC").modules.map((module) => module.key);
const SALES_CRM_MODULE_KEYS = MODULE_ACCESS_GROUPS.find((group) => group.key === "SALES_CRM").modules.map((module) => module.key);
const ALL_MODULE_KEYS = MODULE_ACCESS_GROUPS.flatMap((group) => group.modules.map((module) => module.key));
const ROLE_DEFAULT_MODULE_ACCESS = {
  BRANCH_ADMIN: [...COMMON_MODULE_KEYS, "STUDENT_MANAGEMENT", "ACADEMIC_OPERATIONS", "FEE_ACCOUNTS", "REPORTS_ANALYTICS", "HELPDESK_SUPPORT"],
  BRANCH_ADMIN_SALES_ADMIN: [...COMMON_MODULE_KEYS, "STUDENT_MANAGEMENT", "ACADEMIC_OPERATIONS", "FEE_ACCOUNTS", "REPORTS_ANALYTICS", "HELPDESK_SUPPORT", "LEAD_MANAGEMENT", "ADMISSION_MANAGEMENT", "SALES_CRM_REPORTS"],
  SALES_ADMIN: [...COMMON_MODULE_KEYS, "LEAD_MANAGEMENT", "ADMISSION_MANAGEMENT", "SALES_CRM_REPORTS"],
};

const ACCOUNT_TYPE_MODULE_KEYS = {
  BRANCH_ADMIN: [...COMMON_MODULE_KEYS, ...ACADEMIC_MODULE_KEYS],
  BRANCH_ADMIN_SALES_ADMIN: [...COMMON_MODULE_KEYS, ...ACADEMIC_MODULE_KEYS, ...SALES_CRM_MODULE_KEYS],
  SALES_ADMIN: [...COMMON_MODULE_KEYS, ...SALES_CRM_MODULE_KEYS],
};

function normalizeModuleAccess(value, accountType) {
  const role = String(accountType || "BRANCH_ADMIN").trim().toUpperCase();
  const permitted = new Set(ACCOUNT_TYPE_MODULE_KEYS[role] || ACCOUNT_TYPE_MODULE_KEYS.BRANCH_ADMIN);
  const fallback = ROLE_DEFAULT_MODULE_ACCESS[role] || ROLE_DEFAULT_MODULE_ACCESS.BRANCH_ADMIN;
  const requested = Array.isArray(value) ? value : fallback;
  const valid = new Set(requested.map((item) => String(item || "").trim().toUpperCase()).filter((item) => permitted.has(item)));
  COMMON_MODULE_KEYS.forEach((key) => valid.add(key));
  return ALL_MODULE_KEYS.filter((key) => valid.has(key) && permitted.has(key));
}

export { ACADEMIC_MODULE_KEYS, ALL_MODULE_KEYS, ACCOUNT_TYPE_MODULE_KEYS, COMMON_MODULE_KEYS, MODULE_ACCESS_GROUPS, ROLE_DEFAULT_MODULE_ACCESS, SALES_CRM_MODULE_KEYS, normalizeModuleAccess };
