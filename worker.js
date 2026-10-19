/**
 * Cloudflare Worker pour l'extraction de pedigrees de pigeons avec Gemini
 * Contourne les limitations de ReadableStream d'AI Studio et les erreurs 502 sur Firefox/Mobile.
 * Compatible avec l'API Gemini 2026 (response_format, schema JSON exhaustif, extraction via steps).
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Gestion des requêtes CORS préliminaires (OPTIONS)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Worker Pédigree Pigeon Gemini opérationnel.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({
            error: 'Clé API Gemini absente. Veuillez configurer la variable d\'environnement GEMINI_API_KEY dans Cloudflare.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Récupération des données envoyées par le client
      let fileData = '';
      let mimeType = 'image/jpeg';
      let extractedPdfText = '';

      const contentType = request.headers.get('Content-Type') || '';

      if (contentType.includes('application/json')) {
        const body = await request.json();
        fileData = body.fileData || body.file || '';
        mimeType = body.mimeType || 'image/jpeg';
        extractedPdfText = body.extractedPdfText || '';
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file');
        if (file && typeof file !== 'string') {
          mimeType = file.type || 'image/jpeg';
          const arrayBuffer = await file.arrayBuffer();
          // Conversion ArrayBuffer en base64
          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          fileData = btoa(binary);
        } else {
          fileData = formData.get('fileData') || '';
          mimeType = formData.get('mimeType') || 'image/jpeg';
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Format de requête invalide. Envoyez du JSON ou FormData.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!fileData) {
        return new Response(
          JSON.stringify({ error: 'Aucun fichier ni donnée base64 reçue.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Nettoyer le Base64 si un préfixe data:...;base64, est présent
      if (fileData.includes(',')) {
        fileData = fileData.split(',')[1];
      }

      // 3. Schéma JSON exhaustif demandé pour toutes les générations du pedigree
      const pedigreeSchema = {
        type: 'object',
        properties: {
          pigeon: {
            type: 'object',
            properties: {
              nom: { type: 'string', description: 'Nom complet du pigeon' },
              numero_bague: { type: 'string', description: 'Numéro de bague complet, ex: BE-1234567-2023' },
              sexe: { type: 'string', description: 'M ou F' },
              race: { type: 'string' },
              date_naissance: { type: 'string', description: 'Format AAAA-MM-JJ ou texte original' },
              couleur: { type: 'string' },
              eleveur: { type: 'string' },
              proprietaire: { type: 'string' },
            },
            required: ['nom', 'numero_bague', 'sexe', 'race', 'date_naissance'],
          },
          parents: {
            type: 'object',
            properties: {
              pere: { $ref: '#/definitions/ancetre' },
              mere: { $ref: '#/definitions/ancetre' },
            },
          },
          grands_parents: {
            type: 'object',
            properties: {
              paternel_pere: { $ref: '#/definitions/ancetre' },
              paternel_mere: { $ref: '#/definitions/ancetre' },
              maternel_pere: { $ref: '#/definitions/ancetre' },
              maternel_mere: { $ref: '#/definitions/ancetre' },
            },
          },
          arriere_grands_parents: {
            type: 'object',
            properties: {
              pp_pp: { $ref: '#/definitions/ancetre' },
              pp_pm: { $ref: '#/definitions/ancetre' },
              pm_pp: { $ref: '#/definitions/ancetre' },
              pm_pm: { $ref: '#/definitions/ancetre' },
              mp_pp: { $ref: '#/definitions/ancetre' },
              mp_pm: { $ref: '#/definitions/ancetre' },
              mm_pp: { $ref: '#/definitions/ancetre' },
              mm_pm: { $ref: '#/definitions/ancetre' },
            },
          },
          details_elevage: {
            type: 'object',
            properties: {
              nom_eleveur: { type: 'string' },
              adresse_eleveur: { type: 'string' },
              club: { type: 'string' },
              date_acquisition: { type: 'string' },
              observations: { type: 'string' },
            },
          },
          resultats_courses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                course: { type: 'string' },
                date: { type: 'string' },
                position: { type: 'string' },
                nombre_participants: { type: 'string' },
                distance_km: { type: 'string' },
                vitesse: { type: 'string' },
              },
            },
          },
        },
        definitions: {
          ancetre: {
            type: 'object',
            properties: {
              nom: { type: 'string' },
              numero_bague: { type: 'string' },
              race: { type: 'string' },
              couleur: { type: 'string' },
              resultats: { type: 'string', description: 'Résultats de courses ou distinctions, résumé' },
            },
          },
        },
        required: ['pigeon'],
      };

      const systemPrompt =
        "Tu es un extracteur de données spécialisé dans les pedigrees de pigeons de course. Analyse le document PDF ou image fourni. Décris d'abord brièvement ce que tu vois (une phrase). Ensuite, extrais TOUS les champs du schéma JSON fourni, sans exception. Pour chaque ancêtre (parents, grands-parents, arrière-grands-parents), extrais le nom, le numéro de bague, la race, la couleur et les résultats s'ils sont visibles. N'invente AUCUNE donnée : si un champ est illisible ou absent, retourne une chaîne vide. Réponds EXCLUSIVEMENT par un objet JSON valide conforme au schéma, sans texte d'introduction, sans conclusion, sans balises Markdown. Ta réponse doit commencer par { et se terminer par }.";

      // 4. Construction de la requête vers Gemini API
      // Essai 1 : API Interactions (recommandée 2026 avec steps et response_format)
      // Essai 2 : API v1beta generateContent avec responseSchema
      let jsonResult = null;
      let usedMethod = '';

      // TENTATIVE 1 : interactions endpoint
      try {
        const interactionUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
        const interactionPayload = {
          model: 'models/gemini-2.5-flash',
          input: [
            {
              type: 'media',
              media: {
                mime_type: mimeType,
                data: fileData,
              },
            },
            {
              type: 'text',
              text: systemPrompt,
            },
          ],
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: pedigreeSchema,
          },
          thinking_config: {
            thinking_budget: 0,
          },
        };

        const resInter = await fetch(interactionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interactionPayload),
        });

        if (resInter.ok) {
          const interData = await resInter.json();
          // Lecture dans steps comme prescrit
          if (interData.steps && Array.isArray(interData.steps)) {
            for (const step of interData.steps) {
              if (step.output) {
                try {
                  const text = typeof step.output === 'string' ? step.output : JSON.stringify(step.output);
                  jsonResult = JSON.parse(text);
                  usedMethod = 'interactions.steps';
                  break;
                } catch {
                  // continuer
                }
              }
            }
          }
          if (!jsonResult && interData.output) {
            try {
              jsonResult = typeof interData.output === 'string' ? JSON.parse(interData.output) : interData.output;
              usedMethod = 'interactions.output';
            } catch {
              // fallback
            }
          }
        }
      } catch (errInter) {
        console.warn('Interactions API call failed, trying standard endpoint:', errInter);
      }

      // TENTATIVE 2 : generateContent avec responseSchema & low thinking
      if (!jsonResult) {
        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const genPayload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileData,
                  },
                },
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: pedigreeSchema,
            maxOutputTokens: 8192,
            temperature: 0.1,
          },
        };

        const resGen = await fetch(genUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(genPayload),
        });

        if (!resGen.ok) {
          const errText = await resGen.text();
          throw new Error(`Erreur API Gemini (${resGen.status}): ${errText.slice(0, 300)}`);
        }

        const genData = await resGen.json();
        const candidateText = genData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let cleaned = candidateText.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        jsonResult = JSON.parse(cleaned);
        usedMethod = 'generateContent.responseSchema';
      }

      if (!jsonResult || typeof jsonResult !== 'object') {
        throw new Error('Impossible d\'extraire un JSON valide depuis la réponse de Gemini.');
      }

      // 5. Renvoyer le JSON propre au client avec les en-têtes CORS
      return new Response(
        JSON.stringify({
          success: true,
          method: usedMethod,
          data: jsonResult,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Erreur Cloudflare Worker:', error);
      return new Response(
        JSON.stringify({
          error: error.message || 'Erreur interne lors du traitement du pedigree.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
