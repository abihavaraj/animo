import { type ComponentProps } from 'react';
import { Platform } from 'react-native';

// Define basic types for web compatibility
type Href = string;

interface LinkProps {
  href: string;
  onPress?: (event: any) => void;
  children?: React.ReactNode;
  style?: any;
  target?: string;
}

const Link: React.FC<LinkProps> = ({ href, onPress, children, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <a href={href} onClick={onPress} {...props}>
        {children}
      </a>
    );
  }
  // For React Native, return a simple component
  return null;
};

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event: any) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          try {
            const { openBrowserAsync } = require('expo-web-browser');
            await openBrowserAsync(href);
          } catch (error) {
            console.warn('Failed to open browser:', error);
          }
        }
      }}
    />
  );
}