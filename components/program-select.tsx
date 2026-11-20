'use client';
import { Children, isValidElement, type ReactNode } from 'react';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type OptionProps = { value: string; children: ReactNode; disabled?: boolean };
export function ProgramOption(_props: OptionProps) {
  return null;
}

export function ProgramSelect({
  value,
  onChange,
  children,
  className,
  disabled,
  required,
  size = 'default',
  ...aria
}: {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'default';
  'aria-label'?: string;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement<OptionProps>)
    .map((child) => child.props);
  return (
    <Select.Root
      value={value}
      onValueChange={(value) => {
        if (value !== null) onChange({ target: { value } });
      }}
      disabled={disabled}
      required={required}
      items={options.map((option) => ({
        value: option.value,
        label: option.children,
      }))}
    >
      <Select.Trigger
        {...aria}
        className={cn(
          'program-select',
          size === 'sm' && 'program-select-sm',
          className,
        )}
      >
        <Select.Value className="min-w-0 flex-1 truncate text-left" />
        <Select.Icon className="select-chevron">
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={7}
          align="start"
          alignItemWithTrigger={false}
          className="z-[100] outline-none"
        >
          <Select.Popup className="program-menu">
            <Select.ScrollUpArrow className="grid justify-center py-1 text-muted-foreground">
              <ChevronUp size={16} />
            </Select.ScrollUpArrow>
            <Select.List className="p-1.5">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="program-option"
                >
                  <Select.ItemText className="min-w-0 flex-1">
                    {option.children}
                  </Select.ItemText>
                  <Select.ItemIndicator className="shrink-0 text-primary">
                    <Check size={16} strokeWidth={2.5} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="grid justify-center py-1 text-muted-foreground">
              <ChevronDown size={16} />
            </Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
