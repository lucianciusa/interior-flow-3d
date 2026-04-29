import { useGLTF } from "@react-three/drei";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { WebGLRenderer } from "three";

export function configureLoaders(gl: WebGLRenderer) {
  const ktx2 = new KTX2Loader()
    .setTranscoderPath("https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/")
    .detectSupport(gl);
  
  // Apply via the GLTFLoader instance drei uses internally
  const useGLTFHook = useGLTF as any;
  if (!useGLTFHook.preload) {
    useGLTFHook.preload = useGLTFHook.bind(useGLTFHook);
  }

  // Set decoder configuration
  if (useGLTFHook.setDecoderConfig) {
    useGLTFHook.setDecoderConfig({ ktx2, meshopt: MeshoptDecoder });
  } else {
    // Legacy workaround or direct extend if API lacks setDecoderConfig
    console.warn("drei useGLTF missing setDecoderConfig");
  }
}
