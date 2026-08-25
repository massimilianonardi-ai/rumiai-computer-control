# Versioning

Contract, backends, SDKs, and adapters have independent versions.

Compatibility rules:

- Contract major: breaking semantic or schema change.
- Contract minor: backward-compatible capability or field addition.
- Contract patch: clarification or non-semantic correction.
- Backend/SDK/adapter versions describe their own implementation releases.

Every runtime reports its contract version, runtime version, backend name and
version, platform, and capability matrix. Clients must negotiate capabilities
instead of inferring them from OS or package versions.

During initial design the contract is `0.x`: breaking refinements are allowed,
but must still be documented and tested.
