# pipelines/

Modular AI pipeline stages, one package per concern:

ingestion -> ocr -> preprocessing -> classification / nlp / extraction
  -> embeddings -> retrieval -> rag -> llm -> intelligence

Each stage exposes an interface (see pipelines/interfaces) so providers
(Llama 3, Bhashini, LangChain, spaCy, LayoutLM, PaddleOCR, Tesseract) can be
swapped independently. No pipeline logic belongs in app/api route handlers.
