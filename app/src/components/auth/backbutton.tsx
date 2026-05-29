import Link from "next/link";
interface BackButtonProps {
  label: string;
  href: string;
  className?: string;
}

export const BackButton = ({ label, href, className }: BackButtonProps) => {
  return (
    <Link
      href={href}
      className={`${className} ml-1 text-main text-xs hover:text-brandNavy transition duration-500`}
    >
      {label}
    </Link>
  );
};
