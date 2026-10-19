#ifndef OPENGLTEST_SHADERMANAGER_HPP
#define OPENGLTEST_SHADERMANAGER_HPP

#include "Shader.hpp"
#include <vector>
#include <unordered_map>
#include <string>

// load all shader in shaders file
// lets swap between shader with arrows
// lets reload fragment.frag shader

class ShaderManager {
  public:
    // load all shader in shaders file
    ShaderManager();
    // unload
    ~ShaderManager();

    void UseNext();
    void UsePrevious();
    void Reload(); // reload only fragment.frag
    Shader* GetCurrent();
    Shader* GetBlurShader();

    void LoadShader(std::string file);

  private:

    void UseShader(Shader* shader);

    int m_currentShaderIndex;

    std::unordered_map<std::string, Shader*> m_shaderMap;
    std::vector<Shader*> m_shaderVec;
};

#endif //OPENGLTEST_SHADERMANAGER_HPP