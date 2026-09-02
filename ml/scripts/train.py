import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
import os

# Set reproducible random seed
np.random.seed(42)

def load_data():
    events_df = pd.read_csv('../data/revenue_events.csv')
    customers_df = pd.read_csv('../data/customers.csv')
    
    # Merge datasets on customerId
    df = pd.merge(events_df, customers_df, left_on='customerId', right_on='id', suffixes=('', '_customer'))
    
    # Calculate derived feature: days since event
    df['occurredAt'] = pd.to_datetime(df['occurredAt'])
    df['days_since_event'] = (pd.Timestamp.now() - df['occurredAt']).dt.days
    
    return df

def train_and_evaluate():
    df = load_data()
    
    # Define features and target
    target = 'isRecovered'
    
    print("Class Distribution:")
    print(df[target].value_counts(normalize=True))
    
    numeric_features = [
        'amount', 
        'days_since_event',
        'totalTransactions',
        'successfulTransactions',
        'failedTransactions',
        'previousRecoveryAttempts',
        'previousSuccessfulRecoveries'
    ]
    
    categorical_features = [
        'eventType',
        'paymentMethod',
        'failureReason',
        'customerSegment'
    ]
    
    X = df[numeric_features + categorical_features]
    y = df[target]
    
    # Handle missing values if any
    X.loc[:, categorical_features] = X[categorical_features].fillna('UNKNOWN')
    X.loc[:, numeric_features] = X[numeric_features].fillna(0)
    
    # Train-test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ])
    
    # Models
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42)
    }
    
    results = {}
    best_model = None
    best_auc = 0
    best_name = ""
    
    print(f"\nTraining on {len(X_train)} samples, testing on {len(X_test)} samples.")
    print("-" * 50)
    
    for name, model in models.items():
        # Create pipeline
        clf = Pipeline(steps=[('preprocessor', preprocessor),
                              ('classifier', model)])
        
        # Train
        clf.fit(X_train, y_train)
        
        # Predict
        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1]
        
        # Evaluate
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred)
        
        results[name] = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'auc': auc,
            'confusion_matrix': cm
        }
        
        print(f"Model: {name}")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"F1 Score: {f1:.4f}")
        print(f"ROC AUC: {auc:.4f}")
        print(f"Confusion Matrix:\n{cm}")
        print("-" * 50)
        
        if auc > best_auc:
            best_auc = auc
            best_model = clf
            best_name = name
            
    print(f"Selected Model: {best_name} (ROC AUC: {best_auc:.4f})")
    print(f"Reason: Selected based on highest ROC AUC score, which is critical for ranking revenue recovery opportunities correctly.")
    
    # Save the best model
    os.makedirs('models', exist_ok=True)
    joblib.dump(best_model, 'models/recovery_pipeline.joblib')
    print("Model pipeline saved to models/recovery_pipeline.joblib")

if __name__ == "__main__":
    train_and_evaluate()

