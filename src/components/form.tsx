/**
 * Small presentational building blocks shared by every form page (register,
 * login, password reset, profile). Deliberately not a full form-library
 * abstraction — each page owns its <form action={...}> and field list;
 * these just keep labels/errors/buttons visually consistent.
 */

export function Field(props: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const { label, name, type = "text", error, ...rest } = props;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        {...rest}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400">
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
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function CheckboxField(props: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  const { label, name, defaultChecked } = props;
  return (
    <label htmlFor={name} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
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
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
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
      className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
    >
      {message}
    </p>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {children}
    </button>
  );
}
