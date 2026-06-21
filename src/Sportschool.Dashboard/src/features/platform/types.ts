export type School = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type SchoolAdmin = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
};

export type CreatedSchoolAdmin = SchoolAdmin & {
  temporaryPassword: string;
};

export type CreateSchoolInput = {
  name: string;
  code: string;
};

export type CreateSchoolAdminInput = {
  email: string;
  fullName: string;
};
