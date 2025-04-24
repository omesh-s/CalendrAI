'use client';
import React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster fixed transform -translate-y-full mt-4 z-50 group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-accent group-[.toast]:text-accent-foreground group-[.toast]:hover:bg-accent/90',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/90',
          success: 'group-[.toaster]:bg-muted group-[.toaster]:text-foreground group-[.toaster]:border-border',
          error: 'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground',
          info: 'group-[.toaster]:bg-muted group-[.toaster]:text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
