import React from 'react';
import './Button.css';

const Button = React.forwardRef(({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 18} />}
      <span>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
