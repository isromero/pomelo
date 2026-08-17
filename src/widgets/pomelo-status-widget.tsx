import { Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, WidgetEnvironment } from 'expo-widgets';

import { widgetColors } from '@/constants/pomelo-theme';

export type PomeloStatusWidgetProps = {
  accessoryLabel?: string;
  action: string;
  title: string;
};

function PomeloStatusWidget(
  props: PomeloStatusWidgetProps,
  environment: WidgetEnvironment
) {
  'widget';
  const colors = widgetColors[environment.colorScheme === 'dark' ? 'dark' : 'light'];
  return (
    <VStack
      alignment="leading"
      modifiers={[
        padding({ all: 16 }),
        widgetURL('pomelo://widget'),
        containerBackground(colors.background, 'widget'),
      ]}
      spacing={8}>
      <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle(colors.title)]}>
        {props.title}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(colors.action)]}>
        {props.action}
      </Text>
      {props.accessoryLabel ? (
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(colors.title)]}>
          {props.accessoryLabel}
        </Text>
      ) : null}
    </VStack>
  );
}

export default createWidget<PomeloStatusWidgetProps>('PomeloStatusWidget', PomeloStatusWidget);
