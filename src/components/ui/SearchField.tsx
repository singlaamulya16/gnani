import { Icon } from './Icon';

interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onVoice?: () => void;
}

export function SearchField({ value, onChange, placeholder, onVoice }: SearchFieldProps) {
  return (
    <div className="relative flex items-center">
      <Icon name="search" size={18} className="pointer-events-none absolute left-4 text-primary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border-2 border-accent/50 bg-surface pl-11 pr-12 text-[14.5px] text-text shadow-[var(--shadow-card)] outline-none transition placeholder:text-text-secondary focus:border-primary"
      />
      {onVoice && (
        <button
          type="button"
          aria-label="Voice search"
          onClick={onVoice}
          className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-accent"
        >
          <Icon name="mic" size={15} />
        </button>
      )}
    </div>
  );
}
