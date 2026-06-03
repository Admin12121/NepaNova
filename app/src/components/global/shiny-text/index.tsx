import { motion } from "framer-motion";

export interface ShinyTextProps {
  text: string;
  duration?: number;
  delay?: number;
}

const ShinyText = ({ text, duration = 2, delay = 0 }: ShinyTextProps) => {
  const width = text.length * 2;

  return (
    <motion.p
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        repeatDelay: delay,
        ease: "linear",
      }}
      className="relative inline-block bg-[length:250%_100%] bg-no-repeat bg-clip-text text-transparent"
      style={{
        backgroundImage: `
          linear-gradient(90deg, transparent calc(50% - 20px), #fff 50%, transparent calc(50% + 20px)), linear-gradient(#525252, #525252)
        `,
      }}
    >
      {text}
    </motion.p>
  );
};

export default ShinyText;
