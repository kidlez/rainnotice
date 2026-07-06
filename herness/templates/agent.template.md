---
id: {{id}}
name: {{name}}
version: 1.0.0
description: {{description}}
trigger: orchestrator.dispatch
input: {{input}}
output: {{output}}
capabilities:
{{#capabilities}}
  - {{.}}
{{/capabilities}}
constraints:
{{#constraints}}
  - {{.}}
{{/constraints}}
state_dir: .devkit/context/{{id}}/
---
