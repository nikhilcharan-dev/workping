import lodash from "lodash";

export const pick = (values, keys) => {
  return lodash.pick(values, keys);
};

export const formatUserDates = (user) => {
  if (!user) return user;
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  if (obj.dateOfJoining instanceof Date) {
    obj.dateOfJoining = obj.dateOfJoining.toISOString().split("T")[0];
  }
  if (obj.dob instanceof Date) {
    obj.dob = obj.dob.toISOString().split("T")[0];
  }
  return obj;
};
