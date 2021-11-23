import Postmate from 'postmate';
export var SchemaFieldTypes;
(function (SchemaFieldTypes) {
    SchemaFieldTypes["ShortText"] = "short_text";
    SchemaFieldTypes["LongText"] = "long_text";
    SchemaFieldTypes["Number"] = "number";
    SchemaFieldTypes["Wysiwyg"] = "wysiwyg";
    SchemaFieldTypes["Boolean"] = "boolean";
    SchemaFieldTypes["Select"] = "select";
    SchemaFieldTypes["Button"] = "button";
    SchemaFieldTypes["Link"] = "link";
    SchemaFieldTypes["ApiKey"] = "api_key";
    SchemaFieldTypes["Html"] = "html";
    SchemaFieldTypes["Password"] = "Password";
})(SchemaFieldTypes || (SchemaFieldTypes = {}));
/**
 * Manages events broadcast from the dashboard and allows for attaching handlers to trigger from those events
 */
class EventBus {
    constructor() {
        this.handlers = [];
    }
    pushHandler(handler) {
        this.handlers.push(handler);
    }
    trigger(event) {
        this.handlers.forEach((handler) => handler(event));
    }
}
/**
 * Represents a connection with the Chec dashboard when this app is rendered within the Chec dashboard, and provides
 * API to community with the dashboard.
 */
export class ConfigSDK {
    constructor(childApi, eventBus) {
        this.parent = childApi;
        this.eventBus = eventBus;
        this.configWatchers = [];
        // Fill in some defaults provided by the dashboard through Postmate. The ts-ignores are here as the Postmate types
        // provided by the community don't include a definition for `childApi.model`, maybe because it's not completely
        // clear if this is intended to be a public API by Postmate.
        // @ts-ignore
        this.config = childApi.model.config || {};
        // @ts-ignore
        this.editMode = Boolean(childApi.model.editMode);
        this.eventBus.pushHandler((event) => {
            if (event.event !== 'set-config') {
                return;
            }
            this.config = event.payload;
            this.configWatchers.forEach((watcher) => watcher(this.config));
        });
    }
    /**
     * Watches for changes to the content height of the app, and updates the Chec dashboard so that the frame height
     * will match the size of the content in the frame
     *
     * Returns a function that will disable the resize watcher for appropriate clean up.
     */
    enableAutoResize() {
        if (!document || !document.body) {
            throw new Error('Auto-resize can only be enabled when a document (and body) is present');
        }
        // Extract height calculation logic into a reusable closure
        const calculateHeight = () => {
            const rect = document.body.getBoundingClientRect();
            return rect.y + rect.height;
        };
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
        };
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
    on(event, key, handler) {
        this.eventBus.pushHandler((candidateEvent) => {
            if (candidateEvent.event === event
                && candidateEvent.field
                && candidateEvent.field.key === key) {
                handler();
            }
        });
    }
    /**
     * Register a function to run when configuration changes
     */
    onConfigUpdate(handler) {
        this.configWatchers.push(handler);
    }
    /**
     * Set the height of the frame in the Chec dashboard so that it will display all the content rendered by the app
     */
    setHeight(height) {
        this.parent.emit('set-height', height.toString());
    }
    /**
     * Update configuration of the integration by providing an object with values that will be merged with the existing
     * configuration.
     *
     * Note the configuration is not deeply merged.
     */
    setConfig(config) {
        this.parent.emit('save', config);
    }
    /**
     * Update the form schema that the Chec dashboard will use to render a configuration form to the user.
     *
     * This function is implemented as a typescript generic to facilitate type safety on just this function, if using the
     * default generic definition of this class.
     */
    setSchema(schema) {
        this.parent.emit('set-schema', schema);
    }
}
/**
 * Establish a connection to the Chec dashboard, and return an instance of the ConfigSDK class to provide API to
 * communicate with the dashboard.
 */
export async function createSDK() {
    // Create an event bus to handle events
    const bus = new EventBus();
    return new ConfigSDK(await new Postmate.Model({
        // Declare the "event" API that the dashboard can call to register events
        event(event) {
            bus.trigger(event);
        }
    }), bus);
}
