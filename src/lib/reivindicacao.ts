import { addDoc, collection } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { PlaceClaim } from '../types';

export async function enviarReivindicacao(
  placeId: string,
  placeName: string,
  userId: string,
  userName: string,
  userHandle: string,
  mensagem: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error('Faça login com uma conta real para reivindicar um estabelecimento.');
  }
  const claim: Omit<PlaceClaim, 'id'> = {
    placeId,
    placeName,
    userId,
    userName,
    userHandle,
    mensagem: mensagem.trim(),
    status: 'pendente',
    createdAt: Date.now(),
  };
  await addDoc(collection(db, 'place_claims'), claim);
}
