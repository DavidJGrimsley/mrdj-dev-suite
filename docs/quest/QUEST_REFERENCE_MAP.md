# Quest development reference map

Verified 2026-11-23. Use these primary sources as read-only references; check the
versioned API and the device rather than assuming a current guide matches the
pinned SDK. Search Meta documentation with `npx -y metavr docs search "<topic>"`
and fetch a result with `npx -y metavr docs fetch "<path>"`.

| Topic | Authoritative reference | Use |
| --- | --- | --- |
| Meta CLI | [Overview](https://developers.meta.com/vr/essentials/metavr-overview/), [install](https://developers.meta.com/vr/essentials/metavr-install/), [device and app commands](https://developers.meta.com/vr/essentials/metavr-devices-and-apps/) | Discover supported commands and capture device evidence. |
| Meta agent skills | [Official meta-quest/agentic-tools](https://github.com/meta-quest/agentic-tools) | Start with `hz-quest-verify-first`, then `hz-spatial-sdk` or the skill for the specific build path. `metavr-cli` describes device and documentation commands. |
| Spatial host | [Architecture](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-architecture/), [Scene](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-scene/) | Check lifecycle, scene and coordinate conventions for the pinned version. |
| Panels | [2D panels](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-2dpanel/) | Native panel setup and links to rendering, communication and resolution guides. |
| Input | [Inputs and controllers](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-inputs-controllers/) | Verify controller and panel input handling. |
| Objects and transforms | [Transforms and coordinates](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-editor-transforms-coordinates/), [Scene](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-scene/) | Validate transforms and orientations with the actual SDK and headset. |
| Reference spaces | [ReferenceSpace v0.15.0](https://developers.meta.com/vr/reference/spatial-sdk/v0.15.0/com_meta_spatial_runtime_referencespace) | Consult the pinned API when investigating recenter behavior. |
| Runtime constraints | [Runtime guidelines](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-runtime-guidelines/) | Measure performance on the target headset; do not assume a universal panel count. |
| Expo | [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [skills](https://docs.expo.dev/skills/), [MCP](https://docs.expo.dev/mcp/) | Match the app's installed Expo SDK; its AGENTS.md also points to the [SDK 56 reference](https://docs.expo.dev/versions/v56.0.0/). |
| Legacy Viro | [ReactVision Viro source](https://github.com/ReactVision/viro), [ReactVision Viro documentation](https://viro-community.readme.io/) | Read-only reference for the preserved alternate prototype. The exact patched renderer revision and patch order are in `apps/i2-companion/tools/quest/viro-renderer/lock.json`. |

The source plan notes conflicting coordinate descriptions across Meta pages.
Treat handedness and sign conventions as an open on-device verification item,
not a rule to copy without testing. Do not run the Meta and Viro paths as
competing owners of one OpenXR session.
