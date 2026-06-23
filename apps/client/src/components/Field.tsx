import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  error?: string;
  className?: string;
}

// ── Input ────────────────────────────────────────────────────────
export interface FieldInputProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input';
}

// ── Select ───────────────────────────────────────────────────────
export interface FieldSelectProps extends BaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select';
  children: ReactNode;
}

// ── Textarea ─────────────────────────────────────────────────────
export interface FieldTextareaProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: 'textarea';
}

export type FieldProps = FieldInputProps | FieldSelectProps | FieldTextareaProps;

const base = 'w-full rounded-lg px-3 py-2 text-sm';
const labelCls = 'mb-1 block text-xs font-medium';
const hintCls = 'mt-1 text-xs';

export const Field = forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  FieldProps
>(function Field(props, ref) {
  const { label, hint, icon, error, className, as = 'input', ...rest } = props;

  const control = (() => {
    const cls = `${base}${icon ? ' pl-8' : ''} ${className ?? ''}`.trim();
    const errorStyle = error ? { borderColor: 'var(--color-error)', boxShadow: '0 0 0 3px rgba(220,38,38,0.15)' } : undefined;

    if (as === 'select') {
      const { children, ...selectRest } = rest as FieldSelectProps;
      return (
        <select ref={ref as React.Ref<HTMLSelectElement>} className={cls} style={errorStyle} {...selectRest}>
          {children}
        </select>
      );
    }
    if (as === 'textarea') {
      return (
        <textarea ref={ref as React.Ref<HTMLTextAreaElement>} className={`${base} ${className ?? ''}`.trim()} rows={3} style={errorStyle} {...(rest as FieldTextareaProps)} />
      );
    }
    return (
      <input ref={ref as React.Ref<HTMLInputElement>} className={cls} style={errorStyle} {...(rest as FieldInputProps)} />
    );
  })();

  return (
    <div>
      {label && (
        <label className={labelCls} style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </label>
      )}
      {icon ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-faint)' }}>
            {icon}
          </span>
          {control}
        </div>
      ) : control}
      {error && (
        <p className={hintCls} style={{ color: 'var(--color-error)' }}>{error}</p>
      )}
      {hint && !error && (
        <p className={hintCls} style={{ color: 'var(--color-text-faint)' }}>{hint}</p>
      )}
    </div>
  );
});
