import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  leftElement,
  rightElement,
  className,
}: PageHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border safe-area-top",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="w-10 flex justify-start">{leftElement}</div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="w-10 flex justify-end">{rightElement}</div>
      </div>
    </header>
  );
};
