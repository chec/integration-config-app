# Integration Configuration App SDK

This SDK is available to help build custom configuration apps for integrations that work with Commerce.js
infrastructure and appear within the Chec Dashboard.

## Installation

```shell
yarn add @chec/integration-configuration-sdk
```

## Usage

There are two options for controlling the configuration of an integration. You can either choose to create a completely
custom web app that will appear within the Chec Dashboard (the "frame" option), or you can dynamically update the form
schema of the integration template, and react to input and events triggered by the user (the "controlled" option).

### Establishing a connection to the Chec Dashboard

As your app will be brought in and shown during a user session in the Chec Dashboard, the app will need to establish a
connection to the dashboard:

```ts
import { createSDK, ConfigSDK } from '@chec/integration-configuration-sdk';

createSDK().then((sdk: ConfigSDK) => {
  // Typescript is shown, but you can remove the references to `ConfigSDK` to convert to native JS
})
```

Next, you will need to decide how you will influence the configuration screen by choosing one of the options detailed
above.

### "Controlled" option

This option does not require your app to product any user interface. Instead, you can use the SDK to update the form
schema that the Chec Dashboard uses to display a form:

```ts
import { createSDK, ConfigSDK } from '@chec/integration-configuration-sdk';

(async () => {
  const sdk = await createSDK();

  sdk.setSchema([
    {
      key: 'name',
      type: 'short_text',
      label: 'Your name',
    },
  ]);
})();
```

When the configuration screen renders in the Chec Dashboard, a form will display that matches the schema set by your
app. As the user fills in the form, the integration config is updated as usual.

#### Watching for events

You can register an event handler that is called when the configuration changes:

```ts
(async () => {
  const sdk = await createSDK();

  sdk.onConfigUpdate((config: object) => {
    console.log(config);
  });
})();
```

You can render buttons and watch for clicks:

```ts
import { createSDK, ConfigSDK } from '@chec/integration-configuration-sdk';

(async () => {
  const sdk = await createSDK();

  sdk.setSchema([
    {
      key: 'my_button',
      type: 'button',
      label: 'Click me',
    },
  ]);

  sdk.on('click', 'my_button', () => {
    console.log('Clicked!');
  });
})();
```

You can also set config attributes directly using `setConfig`. Configuration set this way is merged with existing
configuration.

```ts
(async () => {
  const sdk = await createSDK();

  sdk.setConfig({
    my_custom_option: 'Hello world!',
  });
})();
```

### "Frame" option

You can build a custom UI to configure your app, and set the resulting configuration using the `sdk.setConfig` API
detailed above. The Chec dashboard will render your app in the configuration panel, even when using the "controlled"
option, but your app is hidden until the dashboard knows the height of the content that your app renders. You can
report the height of your app using the SDK, or turn on the automatic height detection system:

```ts
(async () => {
  document.body.innerText = 'Hello world!';

  const sdk = await createSDK();

  sdk.setHeight(20); // In pixels
  // OR
  sdk.enableAutoResize();
})();
```

The UI library used by the Chec dashboard is open source and available for use by your app if you're building with Vue:

https://github.com/chec/ui-library - [Storybook (demo site)](https://chec-ui.netlify.app)
