import osmnx as ox
import networkx as nx
import os

GRAPH_FILENAME = "montreal_graph.graphml"

# Configure OSMnx
ox.settings.use_cache = True
ox.settings.log_console = True

class Router:
    def __init__(self):
        self.graph = None

    def get_graph(self):
        """Loads or downloads the street network graph for Montreal."""
        if self.graph is not None:
            return self.graph

        if os.path.exists(GRAPH_FILENAME):
            print(f"Loading graph from {GRAPH_FILENAME}...")
            self.graph = ox.load_graphml(GRAPH_FILENAME)
        else:
            print("Downloading graph for Montreal, Canada (this may take a while)...")
            self.graph = ox.graph_from_place("Montreal, Canada", network_type='drive')
            print(f"Saving graph to {GRAPH_FILENAME}...")
            ox.save_graphml(self.graph, GRAPH_FILENAME)
        
        print("Graph loaded successfully.")
        return self.graph

    def apply_camera_penalties(self, cameras: list):
        """
        Applies penalties to edges within a safety buffer of surveillance cameras.
        Args:
            cameras: list of dicts with 'lat', 'lng' keys.
        """
        if self.graph is None:
            return

        print("Applying privacy penalties to graph...")
        # Initialize privacy_cost with normal length
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            data['privacy_cost'] = data['length']

        if not cameras:
            return

        try:
            from scipy.spatial import cKDTree
            import numpy as np
        except ImportError:
            print("Error: scipy or numpy not installed. Skipping advanced safety buffer.")
            return

        # 1. Extract Node Coordinates
        nodes_data = [(data['y'], data['x'], n) for n, data in self.graph.nodes(data=True)]
        if not nodes_data:
            return
            
        node_coords = np.array([(lat, lon) for lat, lon, n in nodes_data])
        node_ids = np.array([n for lat, lon, n in nodes_data])

        # 2. Extract Camera Coordinates
        cam_coords = np.array([[c['lat'], c['lng']] for c in cameras])

        # 3. Build Tree and Query Radius
        # r=0.0006 degrees is approx 50-60 meters
        tree = cKDTree(node_coords)
        indices_list = tree.query_ball_point(cam_coords, r=0.0006)

        # 4. Flatten to get Unique Danger Nodes
        danger_node_indices = set()
        for indices in indices_list:
            for idx in indices:
                danger_node_indices.add(idx)
        
        danger_nodes = set(node_ids[list(danger_node_indices)])
        print(f"DEBUG: Found {len(danger_nodes)} danger nodes (within ~50m of cameras).")

        # 5. Penalize Edges connected to Danger Nodes
        penalty_factor = 1000000 
        penalized_count = 0
        
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            if u in danger_nodes or v in danger_nodes:
                data['privacy_cost'] = data['length'] * penalty_factor
                penalized_count += 1

        print(f"DEBUG: Penalized {penalized_count} edges near danger zones.")


    def get_shortest_path(self, start_coords, end_coords):
        """
        Calculates both the fastest and safest paths between two points.
        Args:
            start_coords: tuple (lat, lon)
            end_coords: tuple (lat, lon)
        Returns:
            dict with 'fast' and 'safe' keys containing lists of [lat, lon] coordinates
        """
        G = self.get_graph()
        
        # Ensure privacy_cost exists if not already set (fallback)
        if 'privacy_cost' not in list(G.edges(data=True))[0][2]:
             for u, v, k, data in G.edges(keys=True, data=True):
                data['privacy_cost'] = data['length']

        # Find nearest nodes to the points
        orig_node = ox.nearest_nodes(G, start_coords[1], start_coords[0])
        dest_node = ox.nearest_nodes(G, end_coords[1], end_coords[0])

        try:
            # Calculate Fastest Path (Standard)
            path_nodes_fast = nx.shortest_path(G, orig_node, dest_node, weight='length')
            
            # Calculate Safest Path (Privacy focused)
            path_nodes_safe = nx.shortest_path(G, orig_node, dest_node, weight='privacy_cost')
            
            # Convert node IDs to coordinates
            def nodes_to_coords(nodes):
                coords = []
                for node in nodes:
                    point = G.nodes[node]
                    coords.append([point['y'], point['x']])
                return coords

            return {
                "fast": nodes_to_coords(path_nodes_fast),
                "safe": nodes_to_coords(path_nodes_safe)
            }

        except nx.NetworkXNoPath:
            print("No path found between the specified points.")
            return {"fast": [], "safe": []}
        except Exception as e:
            print(f"Error calculating path: {e}")
            return {"fast": [], "safe": []}

# Singleton instance
router = Router()
