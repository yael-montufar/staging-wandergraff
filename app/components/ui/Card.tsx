import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  clickable = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg shadow-sm border border-gray-200 bg-white overflow-hidden ${
        clickable ? "hover:shadow-md transition-shadow cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>{children}</div>;
}

export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`px-4 py-3 border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
}
