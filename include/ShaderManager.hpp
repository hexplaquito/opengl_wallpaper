#ifndef OPENGLTEST_SHADERMANAGER_HPP
#define OPENGLTEST_SHADERMANAGER_HPP

#include "Shader.hpp"
#include <vector>

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

  private:

    void UseShader(Shader* shader);

    std::vector<Shader*> m_shaders;
    Shader* m_current;
    int m_currentShader;
};

#endif //OPENGLTEST_SHADERMANAGER_HPP