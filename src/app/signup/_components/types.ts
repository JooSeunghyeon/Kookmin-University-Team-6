export interface SchoolOption {
  id: string;
  name: string;
  email_domain: string;
}

export interface SignupFormState {
  schoolId: string;
  schoolName: string;
  schoolDomain: string;
  emailLocalPart: string;
  password: string;
  passwordConfirm: string;
  realName: string;
  studentNo: string;
  department: string;
  nickname: string;
}

export const INITIAL_SIGNUP_FORM: SignupFormState = {
  schoolId: "",
  schoolName: "",
  schoolDomain: "",
  emailLocalPart: "",
  password: "",
  passwordConfirm: "",
  realName: "",
  studentNo: "",
  department: "",
  nickname: "",
};
