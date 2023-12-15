import styles from './obutton.module.css'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export default function OutlinedButton({ children, className, ...props }: Props) {
  return (
    <button className={`${styles.outlinedButton} ${className}`} {...props}>
      {children}
    </button>
  )
}