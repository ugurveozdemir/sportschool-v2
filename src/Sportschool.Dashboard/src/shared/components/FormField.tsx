import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  error?: string;
};

type InputFieldProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function InputField({ label, error, ...props }: InputFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" {...props} />
      {error ? <small style={{ color: "var(--danger)" }}>{error}</small> : null}
    </div>
  );
}

type SelectFieldProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, error, children, ...props }: SelectFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="select" {...props}>
        {children}
      </select>
      {error ? <small style={{ color: "var(--danger)" }}>{error}</small> : null}
    </div>
  );
}

type TextareaFieldProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, error, ...props }: TextareaFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea className="textarea" {...props} />
      {error ? <small style={{ color: "var(--danger)" }}>{error}</small> : null}
    </div>
  );
}
