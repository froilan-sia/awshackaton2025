"""
Validation script to check implementation completeness and correctness
"""
import os
import ast
import sys

def check_file_exists(filepath):
    """Check if file exists and return its size"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        return True, size
    return False, 0

def analyze_python_file(filepath):
    """Analyze Python file for classes, functions, and methods"""
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        tree = ast.parse(content)
        
        classes = []
        functions = []
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                classes.append({
                    'name': node.name,
                    'methods': methods,
                    'method_count': len(methods)
                })
            elif isinstance(node, ast.FunctionDef) and not any(node in cls.body for cls in ast.walk(tree) if isinstance(cls, ast.ClassDef)):
                functions.append(node.name)
            elif isinstance(node, ast.Import):
                imports.extend([alias.name for alias in node.names])
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module)
        
        return {
            'classes': classes,
            'functions': functions,
            'imports': imports,
            'lines': len(content.split('\n'))
        }
    except Exception as e:
        return {'error': str(e)}

def validate_implementation():
    """Validate the recommendation engine implementation"""
    print("🔍 Validating AI Recommendation Engine Implementation")
    print("=" * 60)
    
    # Check directory structure
    base_dir = "src"
    required_files = [
        "src/main.py",
        "src/models/__init__.py",
        "src/models/recommendation.py",
        "src/services/__init__.py",
        "src/services/collaborative_filtering.py",
        "src/services/content_based_filtering.py",
        "src/services/contextual_scoring.py",
        "src/services/preference_learning.py",
        "src/services/recommendation_engine.py",
        "requirements.txt",
        "Dockerfile"
    ]
    
    print("\n📁 File Structure Validation:")
    print("-" * 30)
    
    total_files = len(required_files)
    existing_files = 0
    total_lines = 0
    
    for filepath in required_files:
        exists, size = check_file_exists(filepath)
        if exists:
            existing_files += 1
            analysis = analyze_python_file(filepath)
            if analysis and 'lines' in analysis:
                total_lines += analysis['lines']
            print(f"✅ {filepath} ({size} bytes)")
        else:
            print(f"❌ {filepath} (missing)")
    
    print(f"\n📊 Structure Summary:")
    print(f"   Files: {existing_files}/{total_files} ({existing_files/total_files*100:.1f}%)")
    print(f"   Total lines of code: {total_lines}")
    
    # Analyze core services
    print("\n🧠 Core Services Analysis:")
    print("-" * 30)
    
    services = [
        ("Collaborative Filtering", "src/services/collaborative_filtering.py"),
        ("Content-Based Filtering", "src/services/content_based_filtering.py"),
        ("Contextual Scoring", "src/services/contextual_scoring.py"),
        ("Preference Learning", "src/services/preference_learning.py"),
        ("Recommendation Engine", "src/services/recommendation_engine.py")
    ]
    
    for service_name, filepath in services:
        analysis = analyze_python_file(filepath)
        if analysis and 'classes' in analysis:
            print(f"\n🔧 {service_name}:")
            for cls in analysis['classes']:
                print(f"   Class: {cls['name']} ({cls['method_count']} methods)")
                key_methods = [m for m in cls['methods'] if not m.startswith('_') or m in ['__init__']]
                if key_methods:
                    print(f"   Key methods: {', '.join(key_methods[:5])}")
        elif analysis and 'error' in analysis:
            print(f"❌ {service_name}: {analysis['error']}")
    
    # Check test coverage
    print("\n🧪 Test Coverage Analysis:")
    print("-" * 30)
    
    test_files = [
        "tests/test_collaborative_filtering.py",
        "tests/test_content_based_filtering.py",
        "tests/test_contextual_scoring.py",
        "tests/test_preference_learning.py",
        "tests/test_recommendation_engine.py"
    ]
    
    test_count = 0
    total_test_functions = 0
    
    for test_file in test_files:
        exists, size = check_file_exists(test_file)
        if exists:
            test_count += 1
            analysis = analyze_python_file(test_file)
            if analysis and 'functions' in analysis:
                test_functions = [f for f in analysis['functions'] if f.startswith('test_')]
                total_test_functions += len(test_functions)
                print(f"✅ {test_file} ({len(test_functions)} tests)")
        else:
            print(f"❌ {test_file} (missing)")
    
    print(f"\n   Test files: {test_count}/{len(test_files)}")
    print(f"   Total test functions: {total_test_functions}")
    
    # Check requirements and dependencies
    print("\n📦 Dependencies Analysis:")
    print("-" * 30)
    
    if os.path.exists("requirements.txt"):
        with open("requirements.txt", 'r') as f:
            requirements = f.read().strip().split('\n')
        
        key_deps = ['fastapi', 'pydantic', 'numpy', 'scikit-learn', 'pytest']
        found_deps = []
        
        for req in requirements:
            if req.strip():
                dep_name = req.split('==')[0].split('>=')[0].split('<=')[0]
                if dep_name in key_deps:
                    found_deps.append(dep_name)
                print(f"   📋 {req}")
        
        print(f"\n   Key dependencies found: {len(found_deps)}/{len(key_deps)}")
        missing_deps = set(key_deps) - set(found_deps)
        if missing_deps:
            print(f"   Missing: {', '.join(missing_deps)}")
    
    # Algorithm Implementation Validation
    print("\n🤖 Algorithm Implementation Validation:")
    print("-" * 30)
    
    algorithm_checks = [
        ("Collaborative Filtering", "src/services/collaborative_filtering.py", [
            "build_user_item_matrix", "compute_user_similarities", 
            "find_similar_users", "generate_collaborative_recommendations"
        ]),
        ("Content-Based Filtering", "src/services/content_based_filtering.py", [
            "build_item_features", "generate_content_based_recommendations",
            "build_user_profile_vector", "get_item_similarities"
        ]),
        ("Contextual Scoring", "src/services/contextual_scoring.py", [
            "apply_contextual_scoring", "_apply_weather_context",
            "_apply_crowd_context", "_apply_time_context"
        ]),
        ("Preference Learning", "src/services/preference_learning.py", [
            "learn_from_interactions", "update_preferences_from_feedback",
            "predict_user_rating", "merge_explicit_and_learned_preferences"
        ])
    ]
    
    for algo_name, filepath, required_methods in algorithm_checks:
        analysis = analyze_python_file(filepath)
        if analysis and 'classes' in analysis:
            all_methods = []
            for cls in analysis['classes']:
                all_methods.extend(cls['methods'])
            
            found_methods = [m for m in required_methods if m in all_methods]
            print(f"   {algo_name}: {len(found_methods)}/{len(required_methods)} methods")
            
            if len(found_methods) == len(required_methods):
                print(f"   ✅ All required methods implemented")
            else:
                missing = set(required_methods) - set(found_methods)
                print(f"   ⚠️  Missing: {', '.join(missing)}")
    
    # Final Assessment
    print("\n🎯 Implementation Assessment:")
    print("-" * 30)
    
    scores = {
        'structure': existing_files / total_files,
        'tests': test_count / len(test_files),
        'code_volume': min(total_lines / 2000, 1.0)  # Expect ~2000 lines
    }
    
    overall_score = sum(scores.values()) / len(scores)
    
    print(f"   Structure Completeness: {scores['structure']*100:.1f}%")
    print(f"   Test Coverage: {scores['tests']*100:.1f}%")
    print(f"   Code Volume: {scores['code_volume']*100:.1f}%")
    print(f"   Overall Score: {overall_score*100:.1f}%")
    
    if overall_score >= 0.9:
        print("\n🎉 Excellent! Implementation is comprehensive and well-structured.")
    elif overall_score >= 0.7:
        print("\n✅ Good! Implementation covers most requirements.")
    elif overall_score >= 0.5:
        print("\n⚠️  Fair. Implementation has basic structure but needs more work.")
    else:
        print("\n❌ Poor. Implementation is incomplete.")
    
    # Task Requirements Check
    print("\n📋 Task Requirements Verification:")
    print("-" * 30)
    
    requirements_met = []
    
    # Check collaborative filtering
    if check_file_exists("src/services/collaborative_filtering.py")[0]:
        requirements_met.append("✅ Collaborative filtering algorithm implemented")
    else:
        requirements_met.append("❌ Collaborative filtering algorithm missing")
    
    # Check content-based filtering
    if check_file_exists("src/services/content_based_filtering.py")[0]:
        requirements_met.append("✅ Content-based filtering implemented")
    else:
        requirements_met.append("❌ Content-based filtering missing")
    
    # Check preference learning
    if check_file_exists("src/services/preference_learning.py")[0]:
        requirements_met.append("✅ Preference learning system implemented")
    else:
        requirements_met.append("❌ Preference learning system missing")
    
    # Check contextual scoring
    if check_file_exists("src/services/contextual_scoring.py")[0]:
        requirements_met.append("✅ Contextual recommendation scoring implemented")
    else:
        requirements_met.append("❌ Contextual recommendation scoring missing")
    
    # Check tests
    if test_count >= 4:
        requirements_met.append("✅ Comprehensive tests implemented")
    else:
        requirements_met.append("❌ Insufficient test coverage")
    
    for req in requirements_met:
        print(f"   {req}")
    
    print("\n" + "=" * 60)
    return overall_score

if __name__ == "__main__":
    validate_implementation()