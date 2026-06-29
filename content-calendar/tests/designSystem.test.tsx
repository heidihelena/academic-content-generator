import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Badge, Button, cn, cva, Field, Input } from '../src/components/ui';

describe('cn', () => {
  it('joins truthy classes and drops falsy ones', () => {
    expect(cn('a', false, undefined, 'b', null, 'c')).toBe('a b c');
  });
});

describe('cva', () => {
  const box = cva('base', {
    variants: {
      tone: { good: 'tone-good', bad: 'tone-bad' },
      size: { sm: 'size-sm', md: 'size-md' },
    },
    defaultVariants: { tone: 'good', size: 'md' },
  });

  it('applies base + selected variants', () => {
    expect(box({ tone: 'bad', size: 'sm' })).toBe('base tone-bad size-sm');
  });

  it('falls back to defaultVariants', () => {
    expect(box()).toBe('base tone-good size-md');
  });

  it('appends a consumer className last so it can override', () => {
    expect(box({ className: 'extra' })).toBe('base tone-good size-md extra');
  });
});

describe('Button', () => {
  it('maps variant to the matching .btn class and defaults to primary', () => {
    const { rerender } = render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-primary');

    rerender(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
  });

  it('layers size utilities for the dense variant', () => {
    render(<Button size="sm">Compact</Button>);
    expect(screen.getByRole('button', { name: 'Compact' })).toHaveClass('py-1.5', 'text-xs');
  });

  it('shows a spinner and disables itself while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publish
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /Publish/ });
    expect(btn).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to type="button" so it never submits a surrounding form', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('type', 'button');
  });
});

describe('Badge', () => {
  it('renders the default neutral pill', () => {
    render(<Badge>Live</Badge>);
    const badge = screen.getByText('Live');
    expect(badge).toHaveClass('rounded-full', 'text-slate-300');
  });

  it('applies tone and the uppercase chip shape', () => {
    render(
      <Badge tone="brand" size="chip">
        paper
      </Badge>,
    );
    const badge = screen.getByText('paper');
    expect(badge).toHaveClass('text-brand-400', 'uppercase', 'rounded');
  });
});

describe('Field', () => {
  it('associates the label with its control via htmlFor', () => {
    render(
      <Field label="Voice" htmlFor="voice">
        <Input id="voice" defaultValue="bold" />
      </Field>,
    );
    expect(screen.getByLabelText('Voice')).toHaveValue('bold');
  });

  it('shows a hint, or an error that suppresses the hint', () => {
    const { rerender } = render(
      <Field label="Topic" htmlFor="t" hint="What is this about?">
        <Input id="t" />
      </Field>,
    );
    expect(screen.getByText('What is this about?')).toBeInTheDocument();

    rerender(
      <Field label="Topic" htmlFor="t" hint="What is this about?" error="Topic is required">
        <Input id="t" />
      </Field>,
    );
    expect(screen.queryByText('What is this about?')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Topic is required');
  });
});
