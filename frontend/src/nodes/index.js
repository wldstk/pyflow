/**
 * Node type registry
 * ──────────────────
 * All node types map to the single GenericNode component.
 * Rendering is driven entirely by the `data` object sent from the
 * YAML-configured backend — no per-type React components needed.
 *
 * The `type` string (returned by the backend's node spec `node_type` field)
 * controls only:
 *   - Handle placement (input → right only, output → left only)
 *   - Alert styling    (anomaly → amber header when headline.value > 0)
 */
import GenericNode from './GenericNode';

const nodeTypes = {
  input:    GenericNode,
  default:  GenericNode,
  output:   GenericNode,
  averages: GenericNode,
  anomaly:  GenericNode,
};

export default nodeTypes;
