<#macro userProfileFormFields>
    <#assign currentGroup="">

    <#list profile.attributes as attribute>
        <#if attribute.name == 'locale' && realm.internationalizationEnabled && locale.currentLanguageTag?has_content>
            <input type="hidden" id="${attribute.name}" name="${attribute.name}" value="${locale.currentLanguageTag}"/>
        <#else>
            <#assign group = (attribute.group)!"">
            <#if group != currentGroup>
                <#assign currentGroup = group>
                <#if currentGroup != "">
                    <div class="profile-group-header">
                        <#assign groupDisplayHeader = group.displayHeader!"">
                        <#if groupDisplayHeader != "">
                            <h3>${advancedMsg(groupDisplayHeader)!group}</h3>
                        <#else>
                            <h3>${group.name!""}</h3>
                        </#if>

                        <#assign groupDisplayDescription = group.displayDescription!"">
                        <#if groupDisplayDescription != "">
                            <p>${advancedMsg(groupDisplayDescription)!""}</p>
                        </#if>
                    </div>
                </#if>
            </#if>

            <#nested "beforeField" attribute>
            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="${attribute.name}" class="${properties.kcLabelClass!}"><@attributeLabel attribute=attribute /></label>
                    <#if attribute.required><span class="required">*</span></#if>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <#if attribute.annotations.inputHelperTextBefore??>
                        <div class="field-help-copy" id="form-help-text-before-${attribute.name}" aria-live="polite">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextBefore))?no_esc}</div>
                    </#if>
                    <@inputFieldByType attribute=attribute />
                    <#if messagesPerField.existsError(attribute.name)>
                        <span id="input-error-${attribute.name}" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get(attribute.name))?no_esc}
                        </span>
                    </#if>
                    <#if attribute.annotations.inputHelperTextAfter??>
                        <div class="field-help-copy" id="form-help-text-after-${attribute.name}" aria-live="polite">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextAfter))?no_esc}</div>
                    </#if>
                </div>
            </div>
            <#nested "afterField" attribute>
        </#if>
    </#list>

    <#list profile.html5DataAnnotations?keys as key>
        <script type="module" src="${url.resourcesPath}/js/${key}.js"></script>
    </#list>
</#macro>

<#macro attributeLabel attribute>
    <#if attribute.name?ends_with('requestedRole')>
        ${msg('requestedRole')}
    <#elseif attribute.name?ends_with('faculty')>
        ${msg('faculty')}
    <#else>
        ${advancedMsg(attribute.displayName!'')}
    </#if>
</#macro>

<#macro inputFieldByType attribute>
    <#if attribute.name?ends_with('requestedRole')>
        <@selectTag attribute=attribute />
    <#else>
        <#switch attribute.annotations.inputType!''>
        <#case 'textarea'>
            <@textareaTag attribute=attribute />
            <#break>
        <#case 'select'>
        <#case 'multiselect'>
            <@selectTag attribute=attribute />
            <#break>
        <#case 'select-radiobuttons'>
        <#case 'multiselect-checkboxes'>
            <@inputTagSelects attribute=attribute />
            <#break>
        <#default>
            <#if attribute.multivalued && attribute.values?has_content>
                <#list attribute.values as value>
                    <@inputTag attribute=attribute value=value!'' />
                </#list>
            <#else>
                <@inputTag attribute=attribute value=attribute.value!'' />
            </#if>
        </#switch>
    </#if>
</#macro>

<#macro inputTag attribute value>
    <div class="field-control <#if !attribute.name?ends_with('faculty')>field-control--with-icon</#if>">
        <#if !attribute.name?ends_with('faculty')><span class="field-icon" aria-hidden="true"><@inputIcon attribute=attribute /></span></#if>
        <input type="<@inputTagType attribute=attribute />" id="${attribute.name}" name="${attribute.name}" value="${(value!'')}" class="${properties.kcInputClass!}" aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" <#if attribute.readOnly>disabled</#if> <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if> <#if attribute.annotations.inputTypePlaceholder??>placeholder="${advancedMsg(attribute.annotations.inputTypePlaceholder)}"</#if> <#if attribute.annotations.inputTypePattern??>pattern="${attribute.annotations.inputTypePattern}"</#if> <#if attribute.annotations.inputTypeSize??>size="${attribute.annotations.inputTypeSize}"</#if> <#if attribute.annotations.inputTypeMaxlength??>maxlength="${attribute.annotations.inputTypeMaxlength}"</#if> <#if attribute.annotations.inputTypeMinlength??>minlength="${attribute.annotations.inputTypeMinlength}"</#if> <#if attribute.annotations.inputTypeMax??>max="${attribute.annotations.inputTypeMax}"</#if> <#if attribute.annotations.inputTypeMin??>min="${attribute.annotations.inputTypeMin}"</#if> <#if attribute.annotations.inputTypeStep??>step="${attribute.annotations.inputTypeStep}"</#if> <#list attribute.html5DataAnnotations as key, value>data-${key}="${value}" </#list>/>
    </div>
</#macro>

<#macro inputTagType attribute>
    <#compress>
        <#if attribute.annotations.inputType??>
            <#if attribute.annotations.inputType?starts_with('html5-')>
                ${attribute.annotations.inputType[6..]}
            <#else>
                ${attribute.annotations.inputType}
            </#if>
        <#elseif attribute.name == 'email'>
            email
        <#else>
            text
        </#if>
    </#compress>
</#macro>

<#macro textareaTag attribute>
    <div class="field-control field-control--with-icon field-control--textarea">
        <span class="field-icon" aria-hidden="true"><@inputIcon attribute=attribute /></span>
        <textarea id="${attribute.name}" name="${attribute.name}" class="${properties.kcInputClass!}" aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" <#if attribute.readOnly>disabled</#if> <#if attribute.annotations.inputTypeCols??>cols="${attribute.annotations.inputTypeCols}"</#if> <#if attribute.annotations.inputTypeRows??>rows="${attribute.annotations.inputTypeRows}"</#if> <#if attribute.annotations.inputTypeMaxlength??>maxlength="${attribute.annotations.inputTypeMaxlength}"</#if>>${(attribute.value!'')}</textarea>
    </div>
</#macro>

<#macro selectTag attribute>
    <div class="field-control field-control--with-icon field-control--select">
        <span class="field-icon" aria-hidden="true"><@inputIcon attribute=attribute /></span>
        <select id="${attribute.name}" name="${attribute.name}" class="${properties.kcInputClass!}" aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" <#if attribute.readOnly>disabled</#if> <#if attribute.annotations.inputType == 'multiselect'>multiple</#if> <#if attribute.annotations.inputTypeSize??>size="${attribute.annotations.inputTypeSize}"</#if>>
        <option value=""><#if attribute.name?ends_with('requestedRole')>${msg('selectRequestedRole')}<#else>${msg('selectFaculty')}</#if></option>

        <#if attribute.name?ends_with('requestedRole')>
            <option value="student" <#if attribute.value!'' == 'student' || (attribute.values?? && attribute.values?seq_contains('student'))>selected</#if>>${msg('roleStudent')}</option>
            <option value="professor" <#if attribute.value!'' == 'professor' || (attribute.values?? && attribute.values?seq_contains('professor'))>selected</#if>>${msg('roleProfessor')}</option>
        <#elseif attribute.annotations.inputOptionsFromValidation?? && attribute.validators[attribute.annotations.inputOptionsFromValidation]?? && attribute.validators[attribute.annotations.inputOptionsFromValidation].options??>
            <#assign options = attribute.validators[attribute.annotations.inputOptionsFromValidation].options>
            <#list options as option>
                <option value="${option}" <#if attribute.value!'' == option || (attribute.values?? && attribute.values?seq_contains(option))>selected</#if>><@selectOptionLabelText attribute=attribute option=option /></option>
            </#list>
        <#elseif attribute.validators.options?? && attribute.validators.options.options??>
            <#assign options = attribute.validators.options.options>
            <#list options as option>
                <option value="${option}" <#if attribute.value!'' == option || (attribute.values?? && attribute.values?seq_contains(option))>selected</#if>><@selectOptionLabelText attribute=attribute option=option /></option>
            </#list>
        </#if>
        </select>
    </div>
</#macro>

<#macro inputIcon attribute>
    <#if attribute.name == 'email'>
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25v-8.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v.3l6.03 4.37a.75.75 0 0 0 .88 0l6.03-4.37v-.3c0-.69-.56-1.25-1.25-1.25H6.75Zm11.75 3.4-5.15 3.73a2.25 2.25 0 0 1-2.64 0L5.5 9.9v6.35c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V9.9Z" fill="currentColor"/></svg>
    <#elseif attribute.name == 'firstName' || attribute.name == 'lastName'>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 4.75a3.75 3.75 0 1 0 3.75 3.75A3.75 3.75 0 0 0 12 4.75Zm0 6a2.25 2.25 0 1 1 2.25-2.25A2.25 2.25 0 0 1 12 10.75Zm0 2.5c-3.02 0-5.86 1.41-7.3 3.78a.75.75 0 1 0 1.28.78A6.99 6.99 0 0 1 12 14.75a6.99 6.99 0 0 1 6.02 3.06.75.75 0 0 0 1.28-.78C17.86 14.66 15.02 13.25 12 13.25Z" fill="currentColor"/></svg>
    <#elseif attribute.name?ends_with('requestedRole')>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 4 7.5 12 11.5l8-4-8-4Zm-5.72 6.18L6 9.82v4.93l6 3 6-3V9.82l-.28-.14L12 12.5 6.28 9.68Z" fill="currentColor"/></svg>
    <#elseif attribute.name?ends_with('faculty')>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2.75 7.5 12 12l7-3.4v4.15h1.5V7.87L12 3Zm-5.5 8.17v4.08c0 .3.17.58.44.71 1.45.72 3.2 1.04 5.06 1.04 1.86 0 3.61-.32 5.06-1.04.27-.13.44-.41.44-.71v-4.08L12 13.75l-5.5-2.58Z" fill="currentColor"/></svg>
    <#else>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 4.75a3.75 3.75 0 1 0 3.75 3.75A3.75 3.75 0 0 0 12 4.75Zm0 6a2.25 2.25 0 1 1 2.25-2.25A2.25 2.25 0 0 1 12 10.75Zm0 2.5c-3.02 0-5.86 1.41-7.3 3.78a.75.75 0 1 0 1.28.78A6.99 6.99 0 0 1 12 14.75a6.99 6.99 0 0 1 6.02 3.06.75.75 0 0 0 1.28-.78C17.86 14.66 15.02 13.25 12 13.25Z" fill="currentColor"/></svg>
    </#if>
</#macro>

<#macro inputTagSelects attribute>
    <#if attribute.annotations.inputType == 'select-radiobuttons'>
        <#assign inputType = 'radio'>
    <#else>
        <#assign inputType = 'checkbox'>
    </#if>

    <#if attribute.annotations.inputOptionsFromValidation?? && attribute.validators[attribute.annotations.inputOptionsFromValidation]?? && attribute.validators[attribute.annotations.inputOptionsFromValidation].options??>
        <#assign options = attribute.validators[attribute.annotations.inputOptionsFromValidation].options>
    <#elseif attribute.validators.options?? && attribute.validators.options.options??>
        <#assign options = attribute.validators.options.options>
    <#else>
        <#assign options = []>
    </#if>

    <#list options as option>
        <label class="checkbox-row" for="${attribute.name}-${option}">
            <input type="${inputType}" id="${attribute.name}-${option}" name="${attribute.name}" value="${option}" class="checkbox-input" aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" <#if attribute.readOnly>disabled</#if> <#if attribute.values?seq_contains(option)>checked</#if>/>
            <span><@selectOptionLabelText attribute=attribute option=option /></span>
        </label>
    </#list>
</#macro>

<#macro selectOptionLabelText attribute option>
    <#compress>
        <#if attribute.annotations.inputOptionLabels??>
            ${advancedMsg(attribute.annotations.inputOptionLabels[option]!option)}
        <#elseif attribute.annotations.inputOptionLabelsI18nPrefix??>
            ${msg(attribute.annotations.inputOptionLabelsI18nPrefix + '.' + option)}
        <#else>
            ${option}
        </#if>
    </#compress>
</#macro>
