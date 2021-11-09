import Postmate, { ChildAPI } from 'postmate';

/**
 * Represents the minimum information required for a field to be displayed in the Chec dashboard
 */
export interface BaseField {
  key: string,
  type: string,
  label: string,
}

/**
 * Represents an event relayed to the SDK from the dashboard
 */
interface DashboardEvent {
  event: string,
  field: BaseField|null,
  payload: any,
}

/**
 * The expected type of event handler used when registering event handlers with the SDK
 */
type EventHandler = (event: DashboardEvent) => void;

/**
 * Manages events broadcast from the dashboard and allows for attaching handlers to trigger from those events
 */
class EventBus {
  handlers: Array<EventHandler>

  constructor() {
    this.handlers = [];
  }

  pushHandler(handler: EventHandler) {
    this.handlers.push(handler);
  }

  trigger(event: DashboardEvent) {
    this.handlers.forEach((handler) => handler(event));
  }
}

/**
 * Represents the integration configuration that will eventually be saved against the integration record
 */
export type Config = object;

/**
 * The expected type of handler used when registered events to handle changes in integration configuration
 */
export type ConfigWatcher = (config: Config) => void;

/**
 * Represents a connection with the Chec dashboard when this app is rendered within the Chec dashboard, and provides
 * API to community with the dashboard.
 */
export class ConfigSDK {
  parent: ChildAPI;
  eventBus: EventBus;
  config: Config;
  configWatchers: Array<ConfigWatcher>

  constructor(childApi: ChildAPI, eventBus: EventBus) {
    this.parent = childApi;
    this.eventBus = eventBus;
    this.config = {};
    this.configWatchers = [];

    this.eventBus.pushHandler((event: DashboardEvent) => {
      if (event.event !== 'set-config') {
        return;
      }

      this.config = event.payload;

      this.configWatchers.forEach((watcher) => watcher(this.config));
    })
  }

  /**
   * Watches for changes to the content height of the app, and updates the Chec dashboard so that the frame height
   * will match the size of the content in the frame
   *
   * Returns a function that will disable the resize watcher for appropriate clean up.
   */
  enableAutoResize(): () => void {
    if (!document || !document.body) {
      throw new Error('Auto-resize can only be enabled when a document (and body) is present');
    }

    // Extract height calculation logic into a reusable closure
    const calculateHeight = () => {
      const rect = document.body.getBoundingClientRect();
      return rect.y + rect.height;
    }

    // Create a resize observer to watch changes in body height
    const observer = new ResizeObserver(() => {
      this.setHeight(calculateHeight());
    });
    observer.observe(document.body);

    // Broadcast an initial height
    this.setHeight(calculateHeight());

    // Return a cleanup function in-case for usage with APIs that support cleanup (eg. React useEffect)
    return () => {
      observer.disconnect();
    }
  }

  /**
   * Get the current config set by the user in the dashboard
   */
  getConfig() {
    return this.config;
  }

  /**
   * Watch for events on fields that are rendered by the Chec dashboard. Right now this only supports buttons
   *
   * @param {string} event The event name to watch for (eg. "click")
   * @param {string} key The key of the field that the event will be triggered on (eg. "my_button")
   * @param {Function} handler The function to run when the given event is fired on the given field.
   */
  on(event: string, key: string, handler: Function) {
    this.eventBus.pushHandler((candidateEvent: DashboardEvent) => {
      if (
        candidateEvent.event === event
        && candidateEvent.field
        && candidateEvent.field.key === key
      ) {
        handler();
      }
    })
  }

  /**
   * Register a function to run when configuration changes
   */
  onConfigUpdate(handler: ConfigWatcher) {
    this.configWatchers.push(handler);
  }

  /**
   * Set the height of the frame in the Chec dashboard so that it will display all the content rendered by the app
   */
  setHeight(height: number): void {
    this.parent.emit('set-height', height.toString());
  }

  /**
   * Update configuration of the integration by providing an object with values that will be merged with the existing
   * configuration.
   *
   * Note the configuration is not deeply merged.
   */
  setConfig(config: object) {
    this.parent.emit('save', config);
  }

  /**
   * Update the form schema that the Chec dashboard will use to render a configuration form to the user.
   */
  setSchema(schema: Array<object>) {
    this.parent.emit('set-schema', schema);
  }
}

/**
 * Establish a connection to the Chec dashboard, and return an instance of the ConfigSDK class to provide API to
 * communicate with the dashboard.
 */
export const createSDK = async (): Promise<ConfigSDK> => {
  // Create an event bus to handle events
  const bus = new EventBus();

  return new ConfigSDK(await new Postmate.Model({
    // Declare the "event" API that the dashboard can call to register events
    event(event: DashboardEvent) {
      bus.trigger(event);
    }
  }), bus);
}
