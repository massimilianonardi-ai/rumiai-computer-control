# Security baseline

Computer Control is a privileged local capability.

Requirements:

- local-only transport by default;
- least-privilege socket or pipe permissions;
- explicit OS accessibility permissions;
- no inherited private RumiAI HOME/XDG environment for external desktop apps;
- structured audit records without secret payload leakage;
- bounded requests and payload sizes;
- no arbitrary GUI recovery after software faults;
- no LLM-generated coordinates;
- explicit capability checks before action;
- fail closed on stale or ambiguous targets;
- remote transport disabled until a separately reviewed security design exists.
