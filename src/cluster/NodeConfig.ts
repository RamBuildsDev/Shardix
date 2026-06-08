export type NodeRole = "leader" | "follower";

export type PeerConfig = {
  nodeId: string;
  host: string;
  port: number;
};

export type NodeConfig = {
  nodeId: string;
  role: NodeRole;
  host: string;
  port: number;
  walPath: string;
  peers: PeerConfig[];
};
