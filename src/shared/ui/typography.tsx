import { Slot, SlotProps } from '@radix-ui/react-slot';

import { cn } from '@/shared/ui/utils';

interface TypographyProps extends SlotProps {
  className?: string;
  asChild?: boolean;
}

const H1 = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'h1'; // Use Slot if asChild is true, otherwise 'h1'

  return (
    <Component
      className={cn(
        'scroll-m-20 text-4xl text-foreground font-extrabold tracking-tight lg:text-5xl select-text',
        className
      )}
      {...props} // All props, including ref, are forwarded correctly
    />
  );
};

const H2 = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'h2';
  return (
    <Component
      className={cn(
        'scroll-m-20 border-b border-border pb-2 text-3xl text-foreground font-semibold tracking-tight first:mt-0 select-text',
        className
      )}
      {...props}
    />
  );
};

const H3 = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'h3';
  return (
    <Component
      className={cn(
        'scroll-m-20 text-2xl text-foreground font-semibold tracking-tight select-text',
        className
      )}
      {...props}
    />
  );
};

const H4 = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'h4';
  return (
    <Component
      className={cn(
        'scroll-m-20 text-xl text-foreground font-semibold tracking-tight select-text',
        className
      )}
      {...props}
    />
  );
};

const P = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'p';
  return (
    <Component
      className={cn('text-base text-foreground select-text', className)}
      {...props}
    />
  );
};

const BlockQuote = ({
  className,
  asChild = false,
  ...props
}: TypographyProps) => {
  const Component = asChild ? Slot : 'blockquote';
  return (
    <Component
      className={cn(
        'mt-6 border-l-2 border-border pl-6 text-base text-foreground italic select-text',
        className
      )}
      {...props}
    />
  );
};

const Code = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'code';
  return (
    <Component
      className={cn(
        'relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] text-sm text-foreground font-semibold select-text',
        className
      )}
      {...props}
    />
  );
};

const Lead = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'p';
  return (
    <Component
      className={cn('text-xl text-muted-foreground select-text', className)}
      {...props}
    />
  );
};

const Large = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'p';
  return (
    <Component
      className={cn(
        'text-xl text-foreground font-semibold select-text',
        className
      )}
      {...props}
    />
  );
};

const Small = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'small';
  return (
    <Component
      className={cn(
        'text-sm text-foreground font-medium leading-none select-text',
        className
      )}
      {...props}
    />
  );
};

const Muted = ({ className, asChild = false, ...props }: TypographyProps) => {
  const Component = asChild ? Slot : 'span';
  return (
    <Component
      className={cn('text-sm text-muted-foreground select-text', className)}
      {...props}
    />
  );
};

export { BlockQuote, Code, H1, H2, H3, H4, Large, Lead, Muted, P, Small };
