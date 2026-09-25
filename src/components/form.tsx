/**
 * Small presentational building blocks shared by every form page (register,
 * login, password reset, profile). Deliberately not a full form-library
 * abstraction — each page owns its <form action={...}> and field list;
 * these just keep labels/errors/buttons visually consistent.
 */

export function Field(props: {
  label: string;
  name: string;
  id?: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const { label, name, id = name, type = "text", error, ...rest } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="input"
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField(props: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  const { label, name, options, error, ...rest } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="input"
        {...rest}
      >
        <option value="" disabled>
          Bitte wählen
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function CheckboxField(props: {
  label: string;
  name: string;
  id?: string;
  defaultChecked?: boolean;
}) {
  const { label, name, id = name, defaultChecked } = props;
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300"
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-5 w-5 shrink-0 rounded accent-brand-600"
      />
      {label}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="alert alert-error"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="alert alert-success"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" className={`btn btn-primary ${className}`}>
      {children}
    </button>
  );
}
