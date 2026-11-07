// Small form pieces shared by the seller screens.

export function Select({
  label,
  name,
  options,
  defaultValue,
  placeholder,
  onChange,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold">{label}</span>
      <select
        key={defaultValue ?? ""} // rebuild when the saved value changes, so it refills after an error
        name={name}
        defaultValue={defaultValue ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required
        className="h-[52px] appearance-none rounded-[14px] border border-[#d5dae4] bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235a6478%22 stroke-width=%222.2%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat px-3.5 text-[15px] outline-none focus:border-ink"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold">
        {label} <span className="font-medium text-muted">(optional)</span>
      </span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-[14px] border border-[#d5dae4] bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none placeholder:text-[#8a93a5] focus:border-ink"
      />
    </label>
  );
}

// A switch that is really a checkbox, so it works without JavaScript.
export function Switch({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} aria-label={label} className="peer sr-only" />
      <span className="h-7 w-[46px] rounded-full bg-[#d5dae4] transition-colors peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
      <span className="pointer-events-none absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
    </span>
  );
}

// A row of pill checkboxes (days, areas).
export function ChipChecks({ items, prefix, checked }: { items: readonly { key: string; label: string }[]; prefix: string; checked: (key: string) => boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <label key={it.key} className="cursor-pointer">
          <input type="checkbox" name={`${prefix}${it.key}`} defaultChecked={checked(it.key)} className="peer sr-only" />
          <span className="flex h-[38px] items-center rounded-full border border-[#d5dae4] bg-white px-3.5 text-[13px] font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            {it.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Radio({ name, value, defaultChecked, title, detail }: { name: string; value: string; defaultChecked?: boolean; title: string; detail: string }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(20,33,61,0.08)] ring-ink peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        <span className="flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{detail}</span>
        </span>
      </span>
    </label>
  );
}
