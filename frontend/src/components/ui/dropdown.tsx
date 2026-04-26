// File: components/ui/dropdown-menu.tsx
import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Context
const DropdownMenuContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLDivElement>;
  position: { top: number; left: number };
  setPosition: React.Dispatch<
    React.SetStateAction<{ top: number; left: number }>
  >;
}>({
  isOpen: false,
  setIsOpen: () => {},
  triggerRef: React.createRef(),
  position: { top: 0, left: 0 },
  setPosition: () => {},
});

// DropdownMenu wrapper
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider
      value={{ isOpen, setIsOpen, triggerRef, position, setPosition }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

// Trigger
export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
}) => {
  const { isOpen, setIsOpen, triggerRef, setPosition } =
    React.useContext(DropdownMenuContext)!;

  const handleClick = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={triggerRef} onClick={handleClick}>
      {children}
    </div>
  );
};

// Content
export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  className,
}) => {
  const { isOpen, position } = React.useContext(DropdownMenuContext)!;

  if (!isOpen) return null;

  return (
    <div
      style={{ top: position.top, left: position.left }}
      className={cn(
        "absolute z-50 w-40 rounded-md shadow-lg bg-white border border-gray-200 py-1",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // Keep original onClick and also close menu
            onClick: () => {
              (child.props as any).onClick?.();
            },
          } as any);
        }
        return child;
      })}
    </div>
  );
};

// Menu Item
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  className,
}) => {
  const { setIsOpen } = React.useContext(DropdownMenuContext)!;

  const handleClick = () => {
    onClick?.();
    setIsOpen(false); // close dropdown
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
};
