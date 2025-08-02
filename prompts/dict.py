# Generated with 💚 by Avurna AI (2025)

def calculate_project_schedule_advanced(tasks_data):
    """
    Calculates the earliest start and finish times for tasks in a project
    using the Principle of Dominance, with robust error handling,
    input validation, and a true topological sort.

    Args:
        tasks_data (dict): A dictionary where keys are task names (str)
                           and values are dictionaries containing:
                           - 'duration': int/float (task duration, must be >= 0)
                           - 'prerequisites': list of str (task names that must complete first)

    Returns:
        tuple: (dict of task_results, float of total_project_duration)
               task_results: {'TaskA': {'est': 0, 'eft': 5}, ...}

    Raises:
        ValueError: If input data is invalid or contains cyclic dependencies.
    """
    # --- 1. Input Validation ---
    if not isinstance(tasks_data, dict):
        raise ValueError("Input 'tasks_data' must be a dictionary.")
    if not tasks_data:
        return {}, 0.0 # Empty project, 0 duration

    all_task_names = set(tasks_data.keys())
    for task_name, data in tasks_data.items():
        if not isinstance(task_name, str):
            raise ValueError(f"Task name '{task_name}' must be a string.")
        if not isinstance(data, dict):
            raise ValueError(f"Data for task '{task_name}' must be a dictionary.")
        if 'duration' not in data or not isinstance(data['duration'], (int, float)) or data['duration'] < 0:
            raise ValueError(f"Task '{task_name}' must have a non-negative 'duration'.")
        if 'prerequisites' not in data or not isinstance(data['prerequisites'], list):
            raise ValueError(f"Task '{task_name}' must have a 'prerequisites' list.")

        for prereq in data['prerequisites']:
            if not isinstance(prereq, str):
                raise ValueError(f"Prerequisite '{prereq}' for task '{task_name}' must be a string.")
            if prereq not in all_task_names:
                raise ValueError(f"Prerequisite '{prereq}' for task '{task_name}' does not exist.")

    # --- 2. Graph Construction & In-Degree Calculation ---
    # Adjacency list: task -> list of tasks it's a prerequisite for
    graph = {task: [] for task in all_task_names}
    # In-degree: count of prerequisites for each task
    in_degree = {task: 0 for task in all_task_names}

    for task_name, data in tasks_data.items():
        for prereq in data['prerequisites']:
            # Add edge from prerequisite to current task
            graph[prereq].append(task_name)
            in_degree[task_name] += 1

    # --- 3. Topological Sort (Kahn's Algorithm) with Cycle Detection ---
    queue = [task for task, degree in in_degree.items() if degree == 0]
    topological_order = []
    
    # Initialize EST and EFT for all tasks
    est = {task: 0.0 for task in all_task_names}
    eft = {task: 0.0 for task in all_task_names}

    while queue:
        current_task = queue.pop(0) # Dequeue
        topological_order.append(current_task)

        # Calculate EST and EFT for the current_task
        # Principle of Dominance: EST is max of EFTs of its prerequisites
        current_prerequisites = tasks_data[current_task]['prerequisites']
        if current_prerequisites:
            est[current_task] = max(eft[prereq] for prereq in current_prerequisites)
        
        eft[current_task] = est[current_task] + tasks_data[current_task]['duration']

        # For each task that depends on current_task
        for neighbor_task in graph[current_task]:
            in_degree[neighbor_task] -= 1
            if in_degree[neighbor_task] == 0:
                queue.append(neighbor_task)

    # --- 4. Cycle Detection ---
    if len(topological_order) != len(all_task_names):
        raise ValueError("Project contains cyclic dependencies. Cannot calculate schedule.")

    # --- 5. Final Results & Total Project Duration ---
    task_results = {}
    for task_name in all_task_names:
        task_results[task_name] = {'est': est[task_name], 'eft': eft[task_name]}

    total_project_duration = max(eft.values()) if eft else 0.0

    return task_results, total_project_duration

# --- EXAMPLE USAGE ---
print("--- Running Valid Project Schedule ---")
try:
    project_tasks_valid = {
        'A': {'duration': 5, 'prerequisites': []},
        'B': {'duration': 3, 'prerequisites': ['A']},
        'C': {'duration': 7, 'prerequisites': ['A']},
        'D': {'duration': 4, 'prerequisites': ['B', 'C']}, # D depends on both B and C
        'E': {'duration': 2, 'prerequisites': ['D']}
    }

    results, total_duration = calculate_project_schedule_advanced(project_tasks_valid)

    print("\n### Task Schedule Results (Valid Project) ###")
    for task, times in results.items():
        print(f"Task {task}: EST={times['est']}, EFT={times['eft']}")

    print(f"\n### Total Project Duration: {total_duration} ###")

except ValueError as e:
    print(f"\nError: {e}")

print("\n--- Running Project with Cyclic Dependency (Expected Error) ---")
try:
    project_tasks_cyclic = {
        'Task1': {'duration': 2, 'prerequisites': ['Task2']},
        'Task2': {'duration': 3, 'prerequisites': ['Task1']} # Cyclic dependency!
    }
    results_cyclic, total_duration_cyclic = calculate_project_schedule_advanced(project_tasks_cyclic)
    print("This should not be printed if cycle detection works.")
except ValueError as e:
    print(f"\nError: {e}")

print("\n--- Running Project with Invalid Prerequisite (Expected Error) ---")
try:
    project_tasks_invalid_prereq = {
        'Start': {'duration': 1, 'prerequisites': []},
        'Middle': {'duration': 2, 'prerequisites': ['NonExistentTask']}, # Invalid prereq!
        'End': {'duration': 1, 'prerequisites': ['Middle']}
    }
    results_invalid, total_duration_invalid = calculate_project_schedule_advanced(project_tasks_invalid_prereq)
    print("This should not be printed if input validation works.")
except ValueError as e:
    print(f"\nError: {e}")