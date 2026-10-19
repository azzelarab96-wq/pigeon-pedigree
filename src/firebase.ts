import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { PedigreeProject } from './types';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skills guide
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// User Profile sync
export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save Project to Firestore
export async function saveProjectToFirestore(project: PedigreeProject, userId: string): Promise<void> {
  const safeId = project.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `projects/${safeId}`;
  try {
    const payload = {
      id: safeId,
      userId,
      ring: project.ring || 'Sans bague',
      name: project.name || '',
      pigeons: project.pigeons || [],
      ownerName: project.ownerName || '',
      ownerDetails: project.ownerDetails || '',
      logo: project.logo || '',
      theme: project.theme || 'elghali',
      textSize: project.textSize || 'normal',
      showOwnerFooter: !!project.showOwnerFooter,
      createdAt: project.updatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'projects', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load all projects for authenticated user
export async function loadUserProjectsFromFirestore(userId: string): Promise<PedigreeProject[]> {
  const path = 'projects';
  try {
    const q = query(collection(db, 'projects'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const projects: PedigreeProject[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as any;
      projects.push({
        id: data.id,
        ring: data.ring,
        name: data.name,
        pigeons: data.pigeons,
        ownerName: data.ownerName,
        ownerDetails: data.ownerDetails,
        logo: data.logo,
        theme: data.theme,
        textSize: data.textSize,
        showOwnerFooter: data.showOwnerFooter,
        updatedAt: data.updatedAt,
      });
    });
    return projects;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Delete Project from Firestore
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `projects/${safeId}`;
  try {
    await deleteDoc(doc(db, 'projects', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Auth helpers
export async function signInWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return await signOut(auth);
}
