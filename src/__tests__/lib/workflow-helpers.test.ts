import {
  getNodeTypeConfig,
  createDefaultNode,
  formatTimeDelay,
  NODE_TYPE_CONFIGS,
  STATUS_DISPLAY_NAMES,
  CHANNEL_DISPLAY_NAMES,
  OPERATOR_DISPLAY_NAMES,
} from '@/types/workflow';
import type { WorkflowNodeType, TimeUnit } from '@/types/workflow';

describe('workflow helpers', () => {
  describe('getNodeTypeConfig', () => {
    it('should return config for valid node types', () => {
      const nodeTypes: WorkflowNodeType[] = [
        'trigger_start',
        'time_delay',
        'conditional_split',
        'send_sms',
        'send_email',
        'update_status',
        'stop_on_reply',
      ];

      nodeTypes.forEach((type) => {
        const config = getNodeTypeConfig(type);
        expect(config).toBeDefined();
        expect(config?.type).toBe(type);
      });
    });

    it('should return undefined for invalid node type', () => {
      // @ts-expect-error - testing invalid type
      const config = getNodeTypeConfig('invalid_type');
      expect(config).toBeUndefined();
    });

    it('should return correct config properties', () => {
      const config = getNodeTypeConfig('time_delay');
      expect(config).toMatchObject({
        type: 'time_delay',
        label: 'Time Delay',
        description: 'Wait for a specified duration',
        icon: 'Clock',
        category: 'timing',
      });
    });
  });

  describe('createDefaultNode', () => {
    it('should create a trigger_start node with correct defaults', () => {
      const node = createDefaultNode('trigger_start', { x: 100, y: 200 });

      expect(node.type).toBe('trigger_start');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.data.label).toBe('Start');
      expect(node.id).toBeDefined();
    });

    it('should create a time_delay node with correct defaults', () => {
      const node = createDefaultNode('time_delay', { x: 0, y: 0 });

      expect(node.type).toBe('time_delay');
      expect(node.data).toMatchObject({
        label: 'Wait 1 day',
        duration: 1,
        unit: 'days',
      });
    });

    it('should create a conditional_split node with correct defaults', () => {
      const node = createDefaultNode('conditional_split', { x: 0, y: 0 });

      expect(node.type).toBe('conditional_split');
      expect(node.data).toMatchObject({
        label: 'Check condition',
        field: '',
        operator: 'equals',
        value: '',
      });
    });

    it('should create a send_sms node with correct defaults', () => {
      const node = createDefaultNode('send_sms', { x: 0, y: 0 });

      expect(node.type).toBe('send_sms');
      expect(node.data).toMatchObject({
        label: 'Send SMS',
        templateId: null,
        templateName: null,
        fromNumber: null,
      });
    });

    it('should create a send_email node with correct defaults', () => {
      const node = createDefaultNode('send_email', { x: 0, y: 0 });

      expect(node.type).toBe('send_email');
      expect(node.data).toMatchObject({
        label: 'Send Email',
        templateId: null,
        templateName: null,
        fromEmail: null,
        subjectOverride: null,
      });
    });

    it('should create an update_status node with correct defaults', () => {
      const node = createDefaultNode('update_status', { x: 0, y: 0 });

      expect(node.type).toBe('update_status');
      expect(node.data).toMatchObject({
        label: 'Update Status',
        newStatus: 'contacted',
      });
    });

    it('should create a stop_on_reply node with correct defaults', () => {
      const node = createDefaultNode('stop_on_reply', { x: 0, y: 0 });

      expect(node.type).toBe('stop_on_reply');
      expect(node.data).toMatchObject({
        label: 'Stop if replied',
        channel: 'any',
      });
    });

    it('should generate unique IDs for each node', () => {
      const node1 = createDefaultNode('trigger_start', { x: 0, y: 0 });
      const node2 = createDefaultNode('trigger_start', { x: 0, y: 0 });

      expect(node1.id).not.toBe(node2.id);
    });

    it('should throw error for unknown node type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid type
        createDefaultNode('invalid_type', { x: 0, y: 0 });
      }).toThrow('Unknown node type: invalid_type');
    });
  });

  describe('formatTimeDelay', () => {
    it('should format singular minute correctly', () => {
      expect(formatTimeDelay(1, 'minutes')).toBe('1 minute');
    });

    it('should format plural minutes correctly', () => {
      expect(formatTimeDelay(5, 'minutes')).toBe('5 minutes');
    });

    it('should format singular hour correctly', () => {
      expect(formatTimeDelay(1, 'hours')).toBe('1 hour');
    });

    it('should format plural hours correctly', () => {
      expect(formatTimeDelay(24, 'hours')).toBe('24 hours');
    });

    it('should format singular day correctly', () => {
      expect(formatTimeDelay(1, 'days')).toBe('1 day');
    });

    it('should format plural days correctly', () => {
      expect(formatTimeDelay(7, 'days')).toBe('7 days');
    });

    it('should handle zero correctly', () => {
      expect(formatTimeDelay(0, 'minutes')).toBe('0 minutes');
    });
  });

  describe('NODE_TYPE_CONFIGS', () => {
    it('should have 7 node type configurations', () => {
      expect(NODE_TYPE_CONFIGS).toHaveLength(7);
    });

    it('should have unique type values', () => {
      const types = NODE_TYPE_CONFIGS.map((c) => c.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it('should categorize nodes correctly', () => {
      const categories = NODE_TYPE_CONFIGS.reduce((acc, config) => {
        acc[config.category] = (acc[config.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(categories.trigger).toBe(1);
      expect(categories.timing).toBe(1);
      expect(categories.logic).toBe(2);
      expect(categories.action).toBe(3);
    });

    it('should mark conditional_split as having multiple outputs', () => {
      const conditionalConfig = NODE_TYPE_CONFIGS.find(
        (c) => c.type === 'conditional_split'
      );
      expect(conditionalConfig?.hasMultipleOutputs).toBe(true);
    });
  });

  describe('display name constants', () => {
    describe('STATUS_DISPLAY_NAMES', () => {
      it('should have display names for all statuses', () => {
        expect(STATUS_DISPLAY_NAMES.new).toBe('New');
        expect(STATUS_DISPLAY_NAMES.contacted).toBe('Contacted');
        expect(STATUS_DISPLAY_NAMES.responded).toBe('Responded');
        expect(STATUS_DISPLAY_NAMES.qualified).toBe('Qualified');
        expect(STATUS_DISPLAY_NAMES.disqualified).toBe('Disqualified');
      });
    });

    describe('CHANNEL_DISPLAY_NAMES', () => {
      it('should have display names for all channels', () => {
        expect(CHANNEL_DISPLAY_NAMES.any).toBe('Any Channel');
        expect(CHANNEL_DISPLAY_NAMES.sms).toBe('SMS Only');
        expect(CHANNEL_DISPLAY_NAMES.email).toBe('Email Only');
      });
    });

    describe('OPERATOR_DISPLAY_NAMES', () => {
      it('should have display names for all operators', () => {
        expect(OPERATOR_DISPLAY_NAMES.equals).toBe('equals');
        expect(OPERATOR_DISPLAY_NAMES.not_equals).toBe('does not equal');
        expect(OPERATOR_DISPLAY_NAMES.contains).toBe('contains');
        expect(OPERATOR_DISPLAY_NAMES.not_contains).toBe('does not contain');
        expect(OPERATOR_DISPLAY_NAMES.greater_than).toBe('is greater than');
        expect(OPERATOR_DISPLAY_NAMES.less_than).toBe('is less than');
        expect(OPERATOR_DISPLAY_NAMES.is_empty).toBe('is empty');
        expect(OPERATOR_DISPLAY_NAMES.is_not_empty).toBe('is not empty');
      });
    });
  });
});
